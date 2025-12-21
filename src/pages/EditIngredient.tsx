import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { supabase } from '../libs/supabase'
import { useAuth } from '../hooks/useAuth'

interface Category {
  id: string
  name: string
}

export default function EditIngredient() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [servingAmount, setServingAmount] = useState('100')
  const [servingUnit, setServingUnit] = useState('g')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const servingUnits = ['g', 'ml', 'cup', 'piece', 'tbsp', 'tsp', 'oz', 'lb']

  useEffect(() => {
    fetchCategories()
    if (id) {
      fetchIngredient()
    }
  }, [id])

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (e: any) {
      console.error('Error fetching categories:', e)
    }
  }

  async function fetchIngredient() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setName(data.name)
        setBrandName(data.brand_name || '')
        setCategoryId(data.category_id)
        setCalories(data.calories?.toString() || '')
        setProtein(data.protein?.toString() || '')
        setCarbs(data.carbs?.toString() || '')
        setFat(data.fat?.toString() || '')
        setFiber(data.fiber?.toString() || '')

        // Parse serving size
        const match = data.serving_size?.match(/^([\d.]+)(.+)$/)
        if (match) {
          setServingAmount(match[1])
          setServingUnit(match[2])
        }

        if (data.image_url) {
          setExistingImageUrl(data.image_url)
          setImagePreview(data.image_url)
        }
      }
    } catch (e: any) {
      console.error('Error fetching ingredient:', e)
      setError('Failed to load ingredient data')
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      // Create preview
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

      // Compress the image
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      }
      const compressedFile = await imageCompression(imageFile, options)

      // Generate unique filename
      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
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

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({
          name: name.trim(),
          brand_name: brandName.trim() || null,
          category_id: categoryId,
          serving_size: `${servingAmount}${servingUnit}`,
          calories: parseFloat(calories),
          protein: parseFloat(protein),
          carbs: parseFloat(carbs),
          fat: parseFloat(fat),
          fiber: fiber ? parseFloat(fiber) : null,
          image_url: imageUrl,
        })
        .eq('id', id)

      if (updateError) throw updateError

      navigate('/ingredients')
    } catch (e: any) {
      setError(e.message || 'Failed to update ingredient')
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
            <h1 className="text-xl font-bold">Edit Ingredient</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Ingredient Name */}
              <div>
                <label className="label">
                  <span className="label-text">Ingredient Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g., Chicken Breast"
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
                  placeholder="e.g., Perdue, Tyson"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="label">
                  <span className="label-text">Ingredient Image (Optional)</span>
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

              {/* Serving Size */}
              <div>
                <label className="label">
                  <span className="label-text">Base Serving Size</span>
                  <span className="label-text-alt opacity-60">Nutritional info will be per this amount</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    className="input input-bordered w-32"
                    value={servingAmount}
                    onChange={(e) => setServingAmount(e.target.value)}
                    required
                    min="0"
                    disabled={loading}
                  />
                  <select
                    className="select select-bordered flex-1"
                    value={servingUnit}
                    onChange={(e) => setServingUnit(e.target.value)}
                    disabled={loading}
                  >
                    {servingUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nutritional Information */}
              <div className="divider">Nutritional Information (per {servingAmount}{servingUnit})</div>

              <div className="grid grid-cols-2 gap-4">
                {/* Calories */}
                <div>
                  <label className="label">
                    <span className="label-text">Calories (kcal)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input input-bordered w-full"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    required
                    min="0"
                    disabled={loading}
                  />
                </div>

                {/* Protein */}
                <div>
                  <label className="label">
                    <span className="label-text">Protein (g)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input input-bordered w-full"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    required
                    min="0"
                    disabled={loading}
                  />
                </div>

                {/* Carbs */}
                <div>
                  <label className="label">
                    <span className="label-text">Carbs (g)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input input-bordered w-full"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    required
                    min="0"
                    disabled={loading}
                  />
                </div>

                {/* Fat */}
                <div>
                  <label className="label">
                    <span className="label-text">Fat (g)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input input-bordered w-full"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    required
                    min="0"
                    disabled={loading}
                  />
                </div>

                {/* Fiber (optional) */}
                <div>
                  <label className="label">
                    <span className="label-text">Fiber (g) - Optional</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input input-bordered w-full"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    min="0"
                    disabled={loading}
                  />
                </div>
              </div>

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
                  disabled={loading || uploadingImage}
                >
                  {uploadingImage ? 'Uploading image...' : loading ? 'Updating...' : 'Update Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
