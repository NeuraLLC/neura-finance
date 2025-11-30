'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface FileUploadProps {
  disputeId: string
  merchantId: string
  evidenceType: string
  description?: string
  onUploadComplete?: (files: UploadedFile[]) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  accept?: string
}

interface UploadedFile {
  fileName: string
  fileSize: number
  mimeType: string
  supabaseUrl: string
  stripeFileId?: string
}

export default function FileUpload({
  disputeId,
  merchantId,
  evidenceType,
  description,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  accept = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length > maxFiles) {
      onUploadError?.(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate file sizes (8MB max per file)
    const invalidFiles = files.filter(f => f.size > 8 * 1024 * 1024)
    if (invalidFiles.length > 0) {
      onUploadError?.(`File(s) exceed 8MB limit: ${invalidFiles.map(f => f.name).join(', ')}`)
      return
    }

    setSelectedFiles(files)
  }

  const uploadToSupabase = async (file: File): Promise<string> => {
    const timestamp = Date.now()
    const fileName = `${evidenceType}_${timestamp}_${file.name}`
    const filePath = `${merchantId}/${disputeId}/${fileName}`

    const { data, error } = await supabase.storage
      .from('dispute-evidence')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`)
    }

    // Get public URL (for private bucket, we'll use signed URLs)
    const { data: urlData } = supabase.storage
      .from('dispute-evidence')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  const uploadToBackend = async (file: File, supabaseUrl: string) => {
    const formData = new FormData()
    formData.append('files', file)
    formData.append('evidence_type', evidenceType)
    formData.append('supabase_url', supabaseUrl)
    if (description) {
      formData.append('description', description)
    }

    const accessToken = localStorage.getItem('accessToken')

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/disputes/${disputeId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Backend upload failed')
    }

    return await response.json()
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      onUploadError?.('No files selected')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const uploadedFiles: UploadedFile[] = []
      const totalFiles = selectedFiles.length

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]

        // Upload to Supabase Storage first
        const supabaseUrl = await uploadToSupabase(file)

        // Then upload to backend (which uploads to Stripe)
        const backendResponse = await uploadToBackend(file, supabaseUrl)

        uploadedFiles.push({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          supabaseUrl,
          stripeFileId: backendResponse.data[0]?.stripeFileId,
        })

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
      }

      onUploadComplete?.(uploadedFiles)
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      onUploadError?.(error.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="w-full">
      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-sm text-gray-600">
            Click to select files or drag and drop
          </span>
          <span className="text-xs text-gray-500 mt-1">
            PDF, Images, Documents (Max {maxFiles} files, 8MB each)
          </span>
        </label>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected Files ({selectedFiles.length})
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                disabled={uploading}
                className="ml-3 text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Uploading...
            </span>
            <span className="text-sm text-gray-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
