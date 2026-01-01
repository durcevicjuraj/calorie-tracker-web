import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'
import { FOOD_CATEGORIES } from '../constants/categories'

interface Ingredient {
  id: string
  name: string
  brand_name: string | null
  serving_amount: number
  serving_unit: string
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
}

interface FoodIngredient {
  ingredient_id: string
  quantity: string
  unit: string
}

export default function EditFood() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [foodType, setFoodType] = useState<'simple' | 'composite'>('simple')
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [compositeIngredients, setCompositeIngredients] = useState<FoodIngredient[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const servingUnits = ['g', 'ml', 'cup', 'piece', 'tbsp', 'tsp', 'oz', 'lb']

  useEffect(() => {
    fetchIngredients()
    if (id) {
      fetchFood()
    }
  }, [id])

  async function fetchIngredients() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name, brand_name, serving_amount, serving_unit, calories, protein, carbs, sugar, fat, fiber')
        .order('name')

      if (error) throw error
      setIngredients(data || [])
    } catch (e: any) {
      console.error('Error fetching ingredients:', e)
    }
  }

  async function fetchFood() {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*, food_ingredients(ingredient_id, quantity, unit)')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setName(data.name)
        setBrandName(data.brand_name || '')
        setDescription(data.description || '')
        setCategory(data.category || '')

        // Determine food type from food_ingredients
        if (data.food_ingredients && data.food_ingredients.length > 0) {
          if (data.food_ingredients.length === 1) {
            setFoodType('simple')
            setSelectedIngredientId(data.food_ingredients[0].ingredient_id)
          } else {
            setFoodType('composite')
            setCompositeIngredients(data.food_ingredients.map((fi: any) => ({
              ingredient_id: fi.ingredient_id,
              quantity: fi.quantity.toString(),
              unit: fi.unit,
            })))
          }
        }

        if (data.image_url) {
          setExistingImageUrl(data.image_url)
          setImagePreview(data.image_url)
        }
      }
    } catch (e: any) {
      console.error('Error fetching food:', e)
      setError('Failed to load food data')
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
    setExistingImageUrl(null)
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

  function calculateNutrition() {
    if (foodType === 'simple') {
      // For simple food, get nutrition from the selected ingredient
      const ingredient = ingredients.find(i => i.id === selectedIngredientId)
      if (!ingredient) {
        return { calories: 0, protein: 0, carbs: 0, sugar: null, fat: 0, fiber: null }
      }
      return {
        calories: ingredient.calories,
        protein: ingredient.protein,
        carbs: ingredient.carbs,
        sugar: ingredient.sugar,
        fat: ingredient.fat,
        fiber: ingredient.fiber
      }
    } else {
      // For composite food, sum nutrition from all ingredients scaled by quantity
      // NOTE: This assumes units match between ingredient serving and added quantity
      // Unit conversion is not implemented yet
      let totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        sugar: 0,
        fat: 0,
        fiber: 0
      }

      compositeIngredients.forEach(ci => {
        const ingredient = ingredients.find(i => i.id === ci.ingredient_id)
        if (!ingredient) return

        // Calculate multiplier: (added quantity) / (ingredient serving amount)
        const multiplier = parseFloat(ci.quantity) / ingredient.serving_amount

        totals.calories += ingredient.calories * multiplier
        totals.protein += ingredient.protein * multiplier
        totals.carbs += ingredient.carbs * multiplier
        totals.sugar += (ingredient.sugar || 0) * multiplier
        totals.fat += ingredient.fat * multiplier
        totals.fiber += (ingredient.fiber || 0) * multiplier
      })

      return {
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        sugar: totals.sugar > 0 ? totals.sugar : null,
        fat: totals.fat,
        fiber: totals.fiber > 0 ? totals.fiber : null
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || loading) return

    setLoading(true)
    setError(null)

    try {
      // Upload new image if present, otherwise keep existing
      let imageUrl: string | null = existingImageUrl
      if (imageFile) {
        imageUrl = await uploadImage()
      }

      // Calculate nutrition from ingredients
      const nutrition = calculateNutrition()

      // Update food with calculated nutrition
      const { error: updateError } = await supabase
        .from('foods')
        .update({
          name: name.trim(),
          brand_name: brandName.trim() || null,
          description: description.trim() || null,
          category: category.trim(),
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          sugar: nutrition.sugar,
          fat: nutrition.fat,
          fiber: nutrition.fiber,
          image_url: imageUrl,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Delete existing food ingredients
      await supabase
        .from('food_ingredients')
        .delete()
        .eq('food_id', id)

      // Insert food ingredients relationship (for both simple and composite)
      const foodIngredientsData = foodType === 'simple'
        ? [{
            food_id: id,
            ingredient_id: selectedIngredientId,
            quantity: 1,
            unit: 'serving',
          }]
        : compositeIngredients.map(ci => ({
            food_id: id,
            ingredient_id: ci.ingredient_id,
            quantity: parseFloat(ci.quantity),
            unit: ci.unit,
          }))

      const { error: ingredientsError } = await supabase
        .from('food_ingredients')
        .insert(foodIngredientsData)

      if (ingredientsError) throw ingredientsError

      navigate('/foods')
    } catch (e: any) {
      setError(e.message || 'Failed to update food')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this food? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('foods')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      navigate('/foods')
    } catch (e: any) {
      setError(e.message || 'Failed to delete food')
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
            <h1 className="text-xl font-bold">Edit Food</h1>
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

              {/* Description */}
              <div>
                <label className="label">
                  <span className="label-text">Description (Optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Add any notes about this food..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
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
                <input
                  type="text"
                  list="food-categories"
                  className="input input-bordered w-full"
                  placeholder="e.g., Breakfast, Lunch, Dinner"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  disabled={loading}
                />
                <datalist id="food-categories">
                  {FOOD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
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
              <div className="flex gap-3 justify-between mt-4">
                <button
                  type="button"
                  className="btn btn-error"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => navigate('/foods')}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || uploadingImage || (foodType === 'composite' && compositeIngredients.length === 0)}
                  >
                    {uploadingImage ? 'Uploading image...' : loading ? 'Updating...' : 'Update Food'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
