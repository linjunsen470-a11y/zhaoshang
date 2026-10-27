import type { AdminViewServerProps } from 'payload'
import { AdminWorkspaceShell } from './AdminWorkspaceShell'
import TencentSyncView from './TencentSyncView'

export default function TencentSyncRoute(props: AdminViewServerProps) {
  return <AdminWorkspaceShell {...props}><TencentSyncView /></AdminWorkspaceShell>
}
