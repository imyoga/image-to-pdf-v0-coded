"use client"

import { useState } from "react"
import { jsPDF } from "jspdf"
import { RotateCw, RotateCcw, Upload, FileUp, Trash2, Settings, Images } from "lucide-react"
import { useDropzone } from "react-dropzone"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type ImageFile = {
  id: string
  file: File
  preview: string
  rotation: number
}

type PageSize = {
  name: string
  width: number
  height: number
}

export function ImageToPdfConverter() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [pageSize, setPageSize] = useState<string>("letter")
  const [marginSize, setMarginSize] = useState<number>(2) // 2% margin by default
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)

  const pageSizes: Record<string, PageSize> = {
    letter: { name: 'Letter (8.5" x 11")', width: 215.9, height: 279.4 },
    legal: { name: 'Legal (8.5" x 14")', width: 215.9, height: 355.6 },
    tabloid: { name: 'Tabloid (11" x 17")', width: 279.4, height: 431.8 },
    a4: { name: "A4 (210 x 297 mm)", width: 210, height: 297 },
    a3: { name: "A3 (297 x 420 mm)", width: 297, height: 420 },
  }

  const marginOptions = [
    { value: 0, label: "No Margin" },
    { value: 2, label: "Smaller (2%)" },
    { value: 5, label: "Small (5%)" },
    { value: 10, label: "Medium (10%)" },
    { value: 15, label: "Large (15%)" },
    { value: 20, label: "Extra Large (20%)" },
  ]

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".bmp", ".webp"],
    },
    onDrop: (acceptedFiles) => {
      const newImages = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(2, 11),
        file,
        preview: URL.createObjectURL(file),
        rotation: 0,
      }))
      setImages((prev) => [...prev, ...newImages])
    },
  })

  const rotateImage = (id: string, direction: "clockwise" | "counterclockwise") => {
    setImages(
      images.map((image) => {
        if (image.id === id) {
          const change = direction === "clockwise" ? 90 : -90
          return {
            ...image,
            rotation: (image.rotation + change + 360) % 360,
          }
        }
        return image
      }),
    )
  }

  const removeImage = (id: string) => {
    setImages(images.filter((image) => image.id !== id))
  }

  const clearAllImages = () => {
    setImages([])
  }

  const convertToPdf = async () => {
    if (images.length === 0) return

    setConverting(true)
    setProgress(0)

    const selectedPageSize = pageSizes[pageSize]
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [selectedPageSize.width, selectedPageSize.height],
    })

    const totalImages = images.length
    let processedImages = 0

    for (let i = 0; i < images.length; i++) {
      const image = images[i]

      // Create a temporary canvas to handle rotation
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) continue

      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise<void>((resolve) => {
        img.onload = () => {
          let width = img.width
          let height = img.height

          // Swap dimensions if rotated 90 or 270 degrees
          if (image.rotation === 90 || image.rotation === 270) {
            ;[width, height] = [height, width]
          }

          canvas.width = width
          canvas.height = height

          // Translate and rotate context
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((image.rotation * Math.PI) / 180)
          ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height)

          // Add a new page for each image except the first one
          if (i > 0) {
            pdf.addPage([selectedPageSize.width, selectedPageSize.height])
          }

          // Calculate dimensions to fit the page while maintaining aspect ratio
          const pageWidth = pdf.internal.pageSize.getWidth()
          const pageHeight = pdf.internal.pageSize.getHeight()

          let imgWidth = width
          let imgHeight = height

          // Apply margin factor (convert percentage to decimal)
          const marginFactor = marginSize / 100
          const availableWidth = pageWidth * (1 - marginFactor * 2)
          const availableHeight = pageHeight * (1 - marginFactor * 2)

          const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight)

          imgWidth *= ratio
          imgHeight *= ratio

          // Center the image on the page
          const x = (pageWidth - imgWidth) / 2
          const y = (pageHeight - imgHeight) / 2

          // Add the image to the PDF
          const imgData = canvas.toDataURL("image/jpeg", 1.0)
          pdf.addImage(imgData, "JPEG", x, y, imgWidth, imgHeight)

          processedImages++
          setProgress((processedImages / totalImages) * 100)

          resolve()
        }
        img.src = image.preview
      })
    }

    // Save the PDF
    pdf.save("converted-images.pdf")
    setConverting(false)
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Left Sidebar - Controls (20% width) */}
      <div className="w-1/5 bg-slate-900 border-r border-slate-800 flex flex-col shadow-lg">
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Title */}
          <div className="text-center pb-2">
            <h1 
              className="text-lg font-semibold text-slate-100 cursor-help" 
              title="Convert images to PDF with custom page sizes and margins"
            >
              Image to PDF
            </h1>
          </div>
          
          {/* Upload Section */}
          <Card className="border-2 border-dashed border-blue-600/50 bg-blue-950/30 backdrop-blur-sm">
            <CardContent className="p-3">
              <div
                {...getRootProps()}
                className={`rounded-lg p-4 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive 
                    ? "border-2 border-blue-400 bg-blue-900/50" 
                    : "border-2 border-transparent hover:border-blue-500 hover:bg-blue-900/30"
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-xs text-slate-200">
                      {isDragActive ? "Drop images!" : "Upload Images"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Drag & drop or click
                    </p>
                    <p className="text-xs text-slate-400">
                      JPG, PNG, GIF, BMP, WebP
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images Summary */}
          {images.length > 0 && (
            <Card className="border-green-600/50 bg-green-950/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Images className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-slate-200">Images</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 ml-1 bg-green-500/20 text-green-300 border-green-500/30">
                      {images.length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearAllImages}
                    className="h-6 w-6 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors text-slate-400"
                    title="Clear all images"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 text-xs text-slate-400">
                  <p>• One image per page</p>
                  <p>• Auto-resize to fit</p>
                  <p>• Rotations preserved</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PDF Settings */}
          {images.length > 0 && (
            <Card className="border-purple-600/50 bg-purple-950/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-slate-200">
                  <Settings className="h-4 w-4 text-purple-400" />
                  PDF Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Page Size</label>
                  <Select value={pageSize} onValueChange={setPageSize}>
                    <SelectTrigger className="text-xs h-8 border-purple-600/30 bg-slate-800 text-slate-200 focus:border-purple-400">
                      <SelectValue placeholder="Select page size" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {Object.entries(pageSizes).map(([key, size]) => (
                        <SelectItem key={key} value={key} className="text-xs text-slate-200 focus:bg-slate-700">
                          {size.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Margin Size</label>
                  <Select
                    value={marginSize.toString()}
                    onValueChange={(value) => setMarginSize(Number.parseInt(value))}
                  >
                    <SelectTrigger className="text-xs h-8 border-purple-600/30 bg-slate-800 text-slate-200 focus:border-purple-400">
                      <SelectValue placeholder="Select margin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {marginOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()} className="text-xs text-slate-200 focus:bg-slate-700">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Convert Action */}
          {images.length > 0 && (
            <Card className="border-orange-600/50 bg-orange-950/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-200">Generate PDF</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {converting && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-1.5 bg-slate-800" />
                    <p className="text-xs text-center text-slate-300">
                      Converting... {Math.round(progress)}%
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={convertToPdf} 
                  disabled={converting || images.length === 0} 
                  className="w-full gap-2 text-xs h-8 bg-orange-600 hover:bg-orange-500 text-white border-0"
                  size="sm"
                >
                  <FileUp className="h-3 w-3" />
                  {converting ? 'Converting...' : 'Convert to PDF'}
                </Button>
                
                {!converting && (
                  <p className="text-xs text-center text-slate-400">
                    Saves as "converted-images.pdf"
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right Content Area - Image Previews (80% width) */}
      <div className="flex-1 flex flex-col bg-slate-900">
        <div className="p-6 flex-1 overflow-y-auto">
          {images.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                  <Images className="h-12 w-12 text-slate-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-200">No images selected</h3>
                  <p className="text-slate-400 max-w-sm">
                    Upload your images using the panel on the left to get started
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-200">Image Preview & Controls</h2>
                <Badge variant="outline" className="text-sm px-3 py-1 bg-slate-800 border-slate-700 text-slate-300">
                  {images.length} {images.length === 1 ? 'image' : 'images'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                {images.map((image, index) => {
                  const selectedPageSize = pageSizes[pageSize]
                  const aspectRatio = selectedPageSize.width / selectedPageSize.height
                  const marginFactor = marginSize / 100
                  
                  return (
                    <div key={image.id} className="group">
                      <Card className="overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.02] bg-slate-800 border-2 border-slate-700 hover:border-blue-500/50">
                        <div 
                          className="relative bg-slate-700 flex items-center justify-center border-b border-slate-600"
                          style={{ aspectRatio: aspectRatio }}
                        >
                          <div className="absolute top-2 left-2 z-10">
                            <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-600 text-white border-blue-700 shadow-sm">
                              {index + 1}
                            </Badge>
                          </div>
                          
                          {/* PDF Page Preview with Margins */}
                          <div className="w-full h-full bg-white rounded-sm shadow-inner relative overflow-hidden">
                            {/* Margin indicators */}
                            {marginSize > 0 && (
                              <div 
                                className="absolute inset-0 border-2 border-dashed border-gray-300/50"
                                style={{
                                  margin: `${marginFactor * 100}%`
                                }}
                              />
                            )}
                            
                            {/* Image positioned within margins */}
                            <div 
                              className="absolute inset-0 flex items-center justify-center"
                              style={{
                                padding: `${marginFactor * 100}%`
                              }}
                            >
                              <img
                                src={image.preview || "/placeholder.svg"}
                                alt={image.file.name}
                                className="object-contain max-h-full max-w-full transition-transform duration-200"
                                style={{ transform: `rotate(${image.rotation}deg)` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-3 space-y-3 bg-slate-800">
                          <p className="text-xs truncate font-medium text-slate-300" title={image.file.name}>
                            {image.file.name}
                          </p>
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-500/20 bg-slate-700 hover:text-blue-400 border border-slate-600 hover:border-blue-500/50 text-slate-300"
                              onClick={() => rotateImage(image.id, "counterclockwise")}
                              title="Rotate counterclockwise"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-500/20 bg-slate-700 hover:text-blue-400 border border-slate-600 hover:border-blue-500/50 text-slate-300"
                              onClick={() => rotateImage(image.id, "clockwise")}
                              title="Rotate clockwise"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 bg-slate-700 border border-slate-600 hover:border-red-500/50"
                              onClick={() => removeImage(image.id)}
                              title="Remove image"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

