import { ImageToPdfConverter } from "@/components/image-to-pdf-converter"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Image to PDF Converter</h1>
      <ImageToPdfConverter />
    </main>
  )
}

