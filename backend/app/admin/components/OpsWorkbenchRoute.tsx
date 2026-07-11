import type { AdminViewServerProps } from 'payload'
import { AdminWorkspaceShell } from './AdminWorkspaceShell'
import OpsWorkbenchView from './OpsWorkbenchView'

/** Dashboard / ops landing — team todos, funnel, quality gates, share kit. */
export default function OpsWorkbenchRoute(props: AdminViewServerProps) {
  return (
    <AdminWorkspaceShell {...props}>
      <OpsWorkbenchView />
    </AdminWorkspaceShell>
  )
}
