import type { AdminViewServerProps } from 'payload'
import { AdminWorkspaceShell } from './AdminWorkspaceShell'
import ShareWorkspaceView from './ShareWorkspaceView'

/** /admin/workspace/share — share text + poster kit (custom path needs shell). */
export default function ShareWorkspaceRoute(props: AdminViewServerProps) {
  return (
    <AdminWorkspaceShell {...props}>
      <ShareWorkspaceView />
    </AdminWorkspaceShell>
  )
}
