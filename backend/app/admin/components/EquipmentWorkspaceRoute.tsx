import type { AdminViewServerProps } from 'payload'
import { AdminWorkspaceShell } from './AdminWorkspaceShell'
import EquipmentWorkspaceView from './EquipmentWorkspaceView'

/** Server entry for /admin/workspace/equipment — provides Payload chrome. */
export default function EquipmentWorkspaceRoute(props: AdminViewServerProps) {
  return (
    <AdminWorkspaceShell {...props}>
      <EquipmentWorkspaceView />
    </AdminWorkspaceShell>
  )
}
