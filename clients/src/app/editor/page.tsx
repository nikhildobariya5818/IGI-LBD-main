import { Suspense } from 'react'
import EditorClient from './EditorClient'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorClient />
    </Suspense>
  )
}