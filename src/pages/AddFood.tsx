import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'
import { FOOD_CATEGORIES } from '../constants/categories'

interface Ingredient {
  id: string
  name: string
  brand_name: string | null
  category: string
  serving_amount: number
  serving_unit: string
  calories: number
  protein: number
  carbs: number
  sugar: number | null
  fat: number
  fiber: number | null
  image_url: string | null
}

interface FoodIngredient {
  ingredient_id: string
  quantity: string
  unit: string
}

export default function AddFood() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [foodType, setFoodType] = useState<'simple' | 'composite'>('simple')
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [compositeIngredients, setCompositeIngredients] = useState<FoodIngredient[]>([])
  const [referenceServingAmount, setReferenceServingAmount] = useState('1')
  const [referenceServingUnit, setReferenceServingUnit] = useState('serving')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Ingredient search and filter states
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('')
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState<string>('all')
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [compositeEditIndex, setCompositeEditIndex] = useState<number | null>(null)

  const servingUnits = ['g', 'ml', 'cup', 'piece', 'tbsp', 'tsp', 'oz', 'lb', 'serving']

  useEffect(() => {
    fetchIngredients()
  }, [])

  // Auto-fill reference serving and image when ingredient is selected (for simple foods)
  useEffect(() => {
    if (foodType === 'simple' && selectedIngredientId) {
      const ingredient = ingredients.find(i => i.id === selectedIngredientId)
      if (ingredient) {
        setReferenceServingAmount(ingredient.serving_amount.toString())
        setReferenceServingUnit(ingredient.serving_unit)

        // Auto-set image from ingredient if user hasn't uploaded a custom image
        if (!imageFile && ingredient.image_url) {
          setImagePreview(ingredient.image_url)
        }
      }
    }
  }, [selectedIngredientId, foodType, ingredients, imageFile])

  // Reset to default when switching to composite
  useEffect(() => {
    if (foodType === 'composite') {
      setReferenceServingAmount('1')
      setReferenceServingUnit('serving')

      // Clear inherited image when switching to composite
      if (!imageFile) {
        setImagePreview(null)
      }
    }
  }, [foodType, imageFile])

  async function fetchIngredients() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name, brand_name, category, serving_amount, serving_unit, calories, protein, carbs, sugar, fat, fiber, image_url')
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

  // Get unique ingredient categories
  const ingredientCategories = ['all', ...new Set(ingredients.map(i => i.category || 'Uncategorized'))]

  // Filter ingredients for the selector
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(ingredientSearchQuery.toLowerCase()) ||
      ingredient.brand_name?.toLowerCase().includes(ingredientSearchQuery.toLowerCase())
    const matchesCategory = ingredientCategoryFilter === 'all' || ingredient.category === ingredientCategoryFilter
    return matchesSearch && matchesCategory
  })

  function selectIngredient(ingredientId: string) {
    if (foodType === 'simple') {
      setSelectedIngredientId(ingredientId)
    } else if (compositeEditIndex !== null) {
      // Editing existing ingredient in composite food
      updateCompositeIngredient(compositeEditIndex, 'ingredient_id', ingredientId)
      setCompositeEditIndex(null)
    } else {
      // Adding new ingredient to composite food
      setCompositeIngredients([...compositeIngredients, {
        ingredient_id: ingredientId,
        quantity: '1',
        unit: 'g'
      }])
    }
    setShowIngredientSelector(false)
    setIngredientSearchQuery('')
    setIngredientCategoryFilter('all')
  }

  function openIngredientSelectorForComposite(index: number | null = null) {
    setCompositeEditIndex(index)
    setShowIngredientSelector(true)
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
      // Upload image if present, or use ingredient's image for simple foods
      let imageUrl: string | null = null
      if (imageFile) {
        imageUrl = await uploadImage()
      } else if (foodType === 'simple' && selectedIngredientId) {
        // For simple foods, use the ingredient's image if no custom image is uploaded
        const ingredient = ingredients.find(i => i.id === selectedIngredientId)
        if (ingredient?.image_url) {
          imageUrl = ingredient.image_url
        }
      }

      // Calculate nutrition from ingredients
      const nutrition = calculateNutrition()

      // Use user-set reference serving values
      const refServingAmount = parseFloat(referenceServingAmount)
      const refServingUnit = referenceServingUnit

      // Insert food with calculated nutrition
      const { data: foodData, error: insertError } = await supabase
        .from('foods')
        .insert({
          name: name.trim(),
          brand_name: brandName.trim() || null,
          description: description.trim() || null,
          category: category,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          sugar: nutrition.sugar,
          fat: nutrition.fat,
          fiber: nutrition.fiber,
          reference_serving_amount: refServingAmount,
          reference_serving_unit: refServingUnit,
          image_url: imageUrl,
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Insert food ingredients relationship (for both simple and composite)
      const foodIngredientsData = foodType === 'simple'
        ? [{
            food_id: foodData.id,
            ingredient_id: selectedIngredientId,
            quantity: refServingAmount,
            unit: refServingUnit,
          }]
        : compositeIngredients.map(ci => ({
            food_id: foodData.id,
            ingredient_id: ci.ingredient_id,
            quantity: parseFloat(ci.quantity),
            unit: ci.unit,
          }))

      const { error: ingredientsError } = await supabase
        .from('food_ingredients')
        .insert(foodIngredientsData)

      if (ingredientsError) throw ingredientsError

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
                  <span className="label-text-alt opacity-60">
                    {foodType === 'simple' ? 'Uses ingredient image by default' : 'Will be downscaled to 800px'}
                  </span>
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-base-300"
                    />
                    {!imageFile && foodType === 'simple' && (
                      <div className="badge badge-primary absolute top-2 left-2">
                        From ingredient
                      </div>
                    )}
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

                  {/* Selected Ingredient Display */}
                  {selectedIngredientId && ingredients.find(i => i.id === selectedIngredientId) && (
                    <div className="card bg-base-200 shadow-sm mb-3">
                      <div className="card-body p-4">
                        <div className="flex items-center gap-4">
                          {ingredients.find(i => i.id === selectedIngredientId)?.image_url ? (
                            <img
                              src={ingredients.find(i => i.id === selectedIngredientId)!.image_url!}
                              alt={ingredients.find(i => i.id === selectedIngredientId)!.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-base-300 rounded flex items-center justify-center">
                              <span className="text-2xl">🍽️</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold">
                              {ingredients.find(i => i.id === selectedIngredientId)!.name}
                              {ingredients.find(i => i.id === selectedIngredientId)?.brand_name && (
                                <span className="text-sm opacity-60 ml-2">({ingredients.find(i => i.id === selectedIngredientId)!.brand_name})</span>
                              )}
                            </h4>
                            <p className="text-xs opacity-60">
                              {ingredients.find(i => i.id === selectedIngredientId)!.calories} kcal •
                              P: {ingredients.find(i => i.id === selectedIngredientId)!.protein}g •
                              C: {ingredients.find(i => i.id === selectedIngredientId)!.carbs}g •
                              F: {ingredients.find(i => i.id === selectedIngredientId)!.fat}g
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setShowIngredientSelector(true)}
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!selectedIngredientId && (
                    <button
                      type="button"
                      className="btn btn-outline w-full"
                      onClick={() => setShowIngredientSelector(true)}
                      disabled={ingredients.length === 0}
                    >
                      Select Ingredient
                    </button>
                  )}

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

                  {/* Composite Ingredients List */}
                  <div className="space-y-2 mb-3">
                    {compositeIngredients.map((ci, index) => {
                      const ingredient = ingredients.find(i => i.id === ci.ingredient_id)
                      return (
                        <div key={index} className="card bg-base-200 shadow-sm">
                          <div className="card-body p-3">
                            <div className="flex items-center gap-3">
                              {ingredient?.image_url ? (
                                <img
                                  src={ingredient.image_url}
                                  alt={ingredient.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-base-300 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-xl">🍽️</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">
                                  {ingredient?.name || 'Unknown'}
                                </h4>
                                {ingredient?.brand_name && (
                                  <p className="text-xs opacity-60 truncate">{ingredient.brand_name}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  className="input input-bordered input-sm w-20"
                                  value={ci.quantity}
                                  onChange={(e) => updateCompositeIngredient(index, 'quantity', e.target.value)}
                                  required
                                  min="0"
                                  disabled={loading}
                                />
                                <select
                                  className="select select-bordered select-sm w-20"
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
                                  className="btn btn-sm btn-outline"
                                  onClick={() => openIngredientSelectorForComposite(index)}
                                  disabled={loading}
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-square btn-outline btn-error"
                                  onClick={() => removeCompositeIngredient(index)}
                                  disabled={loading}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openIngredientSelectorForComposite(null)}
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

              {/* Ingredient Selector Modal - Shared by both Simple and Composite */}
              {showIngredientSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="card bg-base-100 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    <div className="card-body">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Select Ingredient</h3>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn-circle"
                          onClick={() => {
                            setShowIngredientSelector(false)
                            setIngredientSearchQuery('')
                            setIngredientCategoryFilter('all')
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Search and Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <input
                          type="text"
                          placeholder="Search ingredients..."
                          className="input input-bordered input-sm w-full"
                          value={ingredientSearchQuery}
                          onChange={(e) => setIngredientSearchQuery(e.target.value)}
                        />
                        <select
                          className="select select-bordered select-sm w-full"
                          value={ingredientCategoryFilter}
                          onChange={(e) => setIngredientCategoryFilter(e.target.value)}
                        >
                          {ingredientCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat === 'all' ? 'All Categories' : cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Ingredients Grid */}
                      <div className="overflow-y-auto max-h-[60vh]">
                        {filteredIngredients.length === 0 ? (
                          <div className="text-center py-12 opacity-60">
                            <p>No ingredients found</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredIngredients.map((ingredient) => (
                              <div
                                key={ingredient.id}
                                className={`card bg-base-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                                  selectedIngredientId === ingredient.id ? 'ring-2 ring-primary' : ''
                                }`}
                                onClick={() => selectIngredient(ingredient.id)}
                              >
                                <div className="card-body p-3">
                                  <div className="flex gap-3">
                                    {ingredient.image_url ? (
                                      <img
                                        src={ingredient.image_url}
                                        alt={ingredient.name}
                                        className="w-16 h-16 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 bg-base-300 rounded flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">🍽️</span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm truncate">
                                        {ingredient.name}
                                      </h4>
                                      {ingredient.brand_name && (
                                        <p className="text-xs opacity-60 truncate">{ingredient.brand_name}</p>
                                      )}
                                      <p className="text-xs opacity-60 mt-1">
                                        {ingredient.serving_amount}{ingredient.serving_unit}
                                      </p>
                                      <div className="text-xs opacity-60 mt-1">
                                        <div>{ingredient.calories} kcal</div>
                                        <div className="flex gap-2">
                                          <span>P:{ingredient.protein}g</span>
                                          <span>C:{ingredient.carbs}g</span>
                                          <span>F:{ingredient.fat}g</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Serving - only show for simple foods or always show */}
              {foodType === 'simple' && (
                <div>
                  <label className="label">
                    <span className="label-text">Serving Size</span>
                    <span className="label-text-alt opacity-60">Auto-filled from ingredient</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-32"
                      placeholder="Amount"
                      value={referenceServingAmount}
                      onChange={(e) => setReferenceServingAmount(e.target.value)}
                      required
                      min="0"
                      disabled={loading}
                    />
                    <select
                      className="select select-bordered flex-1"
                      value={referenceServingUnit}
                      onChange={(e) => setReferenceServingUnit(e.target.value)}
                      disabled={loading}
                    >
                      {servingUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm opacity-60 mt-1">
                    Nutrition values are per this serving size (you can edit if needed)
                  </p>
                </div>
              )}

              {/* Reference Serving for composite foods */}
              {foodType === 'composite' && (
                <div>
                  <label className="label">
                    <span className="label-text">Reference Serving</span>
                    <span className="label-text-alt opacity-60">Nutrition will be "per" this amount</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-32"
                      placeholder="Amount"
                      value={referenceServingAmount}
                      onChange={(e) => setReferenceServingAmount(e.target.value)}
                      required
                      min="0"
                      disabled={loading}
                    />
                    <select
                      className="select select-bordered flex-1"
                      value={referenceServingUnit}
                      onChange={(e) => setReferenceServingUnit(e.target.value)}
                      disabled={loading}
                    >
                      {servingUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm opacity-60 mt-1">
                    Default is "per 1 serving" - adjust as needed
                  </p>
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
