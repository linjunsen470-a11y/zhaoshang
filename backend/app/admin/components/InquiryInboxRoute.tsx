import type { AdminViewServerProps } from 'payload'
import { AdminWorkspaceShell } from './AdminWorkspaceShell'
import InquiryInboxView from './InquiryInboxView'

/** Server entry for /admin/workspace/inquiries — provides Payload chrome. */
export default function InquiryInboxRoute(props: AdminViewServerProps) {
  return (
    <AdminWorkspaceShell {...props}>
      <InquiryInboxView />
    </AdminWorkspaceShell>
  )
}
