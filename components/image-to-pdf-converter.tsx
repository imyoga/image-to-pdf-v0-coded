"use client"

import { useState } from "react"
import { jsPDF } from "jspdf"
import { RotateCw, RotateCcw, Upload, FileUp, Trash2 } from "lucide-react"
import { useDropzone } from "react-dropzone"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

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
  const [marginSize, setMarginSize] = useState<number>(10) // 10% margin by default
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
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Drag & drop images here, or click to select files</p>
            <p className="text-sm text-muted-foreground mt-2">Supports JPG, JPEG, PNG, GIF, BMP, and WebP</p>
          </div>
        </CardContent>
      </Card>

      {images.length > 0 && (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Selected Images ({images.length})</h2>
              <div className="flex items-center gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Page Size:</span>
                    <Select value={pageSize} onValueChange={setPageSize}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select page size" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(pageSizes).map(([key, size]) => (
                          <SelectItem key={key} value={key}>
                            {size.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Margin:</span>
                    <Select
                      value={marginSize.toString()}
                      onValueChange={(value) => setMarginSize(Number.parseInt(value))}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select margin" />
                      </SelectTrigger>
                      <SelectContent>
                        {marginOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={convertToPdf} disabled={converting || images.length === 0} className="gap-2">
                    <FileUp className="h-4 w-4" />
                    Convert to PDF
                  </Button>
                </div>
              </div>
            </div>

            {converting && (
              <div className="flex flex-col gap-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Converting images to PDF... {Math.round(progress)}%
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <div className="relative aspect-square bg-muted flex items-center justify-center">
                    <img
                      src={image.preview || "/placeholder.svg"}
                      alt={image.file.name}
                      className="object-contain max-h-full max-w-full transition-transform"
                      style={{ transform: `rotate(${image.rotation}deg)` }}
                    />
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm truncate max-w-[150px]" title={image.file.name}>
                        {image.file.name}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => rotateImage(image.id, "counterclockwise")}
                          title="Rotate counterclockwise"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => rotateImage(image.id, "clockwise")}
                          title="Rotate clockwise"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeImage(image.id)}
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

