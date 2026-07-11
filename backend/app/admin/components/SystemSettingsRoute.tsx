import type { AdminViewServerProps } from 'payload'
import { AdminWorkspaceShell } from './AdminWorkspaceShell'
import SystemSettingsView from './SystemSettingsView'

/** Server entry for /admin/workspace/system — provides Payload chrome. */
export default function SystemSettingsRoute(props: AdminViewServerProps) {
  return (
    <AdminWorkspaceShell {...props}>
      <SystemSettingsView />
    </AdminWorkspaceShell>
  )
}
