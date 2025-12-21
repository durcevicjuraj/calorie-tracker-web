import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Category {
  id: string
  name: string
}

interface Ingredient {
  id: string
  name: string
  brand_name: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface FoodIngredient {
  ingredient_id: string
  quantity: string
  unit: string
}

export default function AddFood() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [foodType, setFoodType] = useState<'simple' | 'composite'>('simple')
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [compositeIngredients, setCompositeIngredients] = useState<FoodIngredient[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const servingUnits = ['g', 'ml', 'cup', 'piece', 'tbsp', 'tsp', 'oz', 'lb']

  useEffect(() => {
    fetchCategories()
    fetchIngredients()
  }, [])

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
      if (data && data.length > 0) {
        setCategoryId(data[0].id)
      }
    } catch (e: any) {
      console.error('Error fetching categories:', e)
    }
  }

  async function fetchIngredients() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name, brand_name, calories, protein, carbs, fat')
        .order('name')

      if (error) throw error
      setIngredients(data || [])
      if (data && data.length > 0) {
        setSelectedIngredientId(data[0].id)
      }
    } catch (e: any) {
      console.error('Error fetching ingredients:', e)
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile || !user) return null

    try {
      setUploadingImage(true)

      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      }
      const compressedFile = await imageCompression(imageFile, options)

      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('food-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (e: any) {
      console.error('Error uploading image:', e)
      throw new Error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  function addCompositeIngredient() {
    setCompositeIngredients([...compositeIngredients, { ingredient_id: ingredients[0]?.id || '', quantity: '100', unit: 'g' }])
  }

  function removeCompositeIngredient(index: number) {
    setCompositeIngredients(compositeIngredients.filter((_, i) => i !== index))
  }

  function updateCompositeIngredient(index: number, field: keyof FoodIngredient, value: string) {
    const updated = [...compositeIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setCompositeIngredients(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || loading) return

    setLoading(true)
    setError(null)

    try {
      // Upload image if present
      let imageUrl: string | null = null
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      // Insert food
      const { data: foodData, error: insertError } = await supabase
        .from('foods')
        .insert({
          name: name.trim(),
          brand_name: brandName.trim() || null,
          category_id: categoryId,
          is_composite: foodType === 'composite',
          ingredient_id: foodType === 'simple' ? selectedIngredientId : null,
          image_url: imageUrl,
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // If composite, insert food ingredients
      if (foodType === 'composite' && compositeIngredients.length > 0) {
        const foodIngredientsData = compositeIngredients.map(ci => ({
          food_id: foodData.id,
          ingredient_id: ci.ingredient_id,
          quantity: parseFloat(ci.quantity),
          unit: ci.unit,
        }))

        const { error: ingredientsError } = await supabase
          .from('food_ingredients')
          .insert(foodIngredientsData)

        if (ingredientsError) throw ingredientsError
      }

      navigate('/')
    } catch (e: any) {
      setError(e.message || 'Failed to add food')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-base-200">
      {/* Header */}
      <header className="bg-base-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="btn btn-ghost btn-sm mr-4"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">Add Food</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Food Name */}
              <div>
                <label className="label">
                  <span className="label-text">Food Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g., Turkey Sandwich, Greek Salad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Brand Name */}
              <div>
                <label className="label">
                  <span className="label-text">Brand Name (Optional)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g., Subway, Panera"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="label">
                  <span className="label-text">Food Image (Optional)</span>
                  <span className="label-text-alt opacity-60">Will be downscaled to 800px</span>
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-base-300"
                    />
                    <button
                      type="button"
                      className="btn btn-circle btn-sm absolute top-2 right-2"
                      onClick={removeImage}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input file-input-bordered w-full"
                    onChange={handleImageSelect}
                    disabled={loading}
                  />
                )}
              </div>

              {/* Category */}
              <div>
                <label className="label">
                  <span className="label-text">Category</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  disabled={loading || categories.length === 0}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Food Type */}
              <div>
                <label className="label">
                  <span className="label-text">Food Type</span>
                </label>
                <div className="flex gap-4">
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      className="radio"
                      checked={foodType === 'simple'}
                      onChange={() => setFoodType('simple')}
                      disabled={loading}
                    />
                    <span className="label-text">Simple (single ingredient)</span>
                  </label>
                  <label className="label cursor-pointer gap-2">
                    <input
                      type="radio"
                      className="radio"
                      checked={foodType === 'composite'}
                      onChange={() => setFoodType('composite')}
                      disabled={loading}
                    />
                    <span className="label-text">Composite (multiple ingredients)</span>
                  </label>
                </div>
              </div>

              {/* Simple Food: Select Ingredient */}
              {foodType === 'simple' && (
                <div>
                  <label className="label">
                    <span className="label-text">Select Ingredient</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={selectedIngredientId}
                    onChange={(e) => setSelectedIngredientId(e.target.value)}
                    required
                    disabled={loading || ingredients.length === 0}
                  >
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} {ingredient.brand_name ? `(${ingredient.brand_name})` : ''}
                      </option>
                    ))}
                  </select>
                  {ingredients.length === 0 && (
                    <p className="text-sm opacity-60 mt-2">
                      No ingredients available. Add ingredients first.
                    </p>
                  )}
                </div>
              )}

              {/* Composite Food: Add Ingredients */}
              {foodType === 'composite' && (
                <div>
                  <label className="label">
                    <span className="label-text">Ingredients</span>
                  </label>
                  {compositeIngredients.map((ci, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <select
                        className="select select-bordered flex-1"
                        value={ci.ingredient_id}
                        onChange={(e) => updateCompositeIngredient(index, 'ingredient_id', e.target.value)}
                        required
                        disabled={loading}
                      >
                        {ingredients.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name} {ingredient.brand_name ? `(${ingredient.brand_name})` : ''}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        className="input input-bordered w-24"
                        value={ci.quantity}
                        onChange={(e) => updateCompositeIngredient(index, 'quantity', e.target.value)}
                        required
                        min="0"
                        disabled={loading}
                      />
                      <select
                        className="select select-bordered w-24"
                        value={ci.unit}
                        onChange={(e) => updateCompositeIngredient(index, 'unit', e.target.value)}
                        disabled={loading}
                      >
                        {servingUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-square btn-outline btn-error"
                        onClick={() => removeCompositeIngredient(index)}
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm mt-2"
                    onClick={addCompositeIngredient}
                    disabled={loading || ingredients.length === 0}
                  >
                    + Add Ingredient
                  </button>
                  {ingredients.length === 0 && (
                    <p className="text-sm opacity-60 mt-2">
                      No ingredients available. Add ingredients first.
                    </p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && <p className="text-error text-sm">{error}</p>}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate('/')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || uploadingImage || (foodType === 'composite' && compositeIngredients.length === 0)}
                >
                  {uploadingImage ? 'Uploading image...' : loading ? 'Adding...' : 'Add Food'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
