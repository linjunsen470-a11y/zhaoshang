import type { AdminViewServerProps } from 'payload'
import { AdminWorkspaceShell } from './AdminWorkspaceShell'
import QualityWorkspaceView from './QualityWorkspaceView'

/** /admin/workspace/quality — property publish gates (custom path needs shell). */
export default function QualityWorkspaceRoute(props: AdminViewServerProps) {
  return (
    <AdminWorkspaceShell {...props}>
      <QualityWorkspaceView />
    </AdminWorkspaceShell>
  )
}
