import { default as ProjectEditHints } from '@/app/admin/components/ProjectEditHints'
import { default as InquiryActions } from '@/app/admin/components/InquiryActions'
import { default as PropertyWorkspace } from '@/app/admin/components/PropertyWorkspace'
import { default as InquiryInboxView } from '@/app/admin/components/InquiryInboxView'
import { default as EquipmentWorkspaceView } from '@/app/admin/components/EquipmentWorkspaceView'
import { default as PrimaryNav } from '@/app/admin/components/PrimaryNav'
import { default as SystemSettingsView } from '@/app/admin/components/SystemSettingsView'

/** @type import('payload').ImportMap */
export const importMap = {
  "@/app/admin/components/ProjectEditHints#default": ProjectEditHints,
  "@/app/admin/components/InquiryActions#default": InquiryActions,
  "@/app/admin/components/PropertyWorkspace#default": PropertyWorkspace,
  "@/app/admin/components/InquiryInboxView#default": InquiryInboxView,
  "@/app/admin/components/EquipmentWorkspaceView#default": EquipmentWorkspaceView,
  "@/app/admin/components/PrimaryNav#default": PrimaryNav,
  "@/app/admin/components/SystemSettingsView#default": SystemSettingsView,
}
