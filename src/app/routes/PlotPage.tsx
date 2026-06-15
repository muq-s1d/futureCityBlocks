import { useParams } from 'react-router-dom'
import { PageStub } from '@/components/ui/PageStub'

export default function PlotPage() {
  const { id } = useParams()
  return (
    <PageStub title={`Plot #${id ?? '?'}`}>
      <p className="max-w-md font-mono text-sm text-muted">
        Focused plot view — to be built (Build Order step 14).
      </p>
    </PageStub>
  )
}
