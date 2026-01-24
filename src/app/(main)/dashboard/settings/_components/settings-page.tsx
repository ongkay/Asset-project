'use client'

import { Settings2, Undo2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type FontKey, fontOptions } from '@/lib/fonts/registry'
import {
  CONTENT_LAYOUT_OPTIONS,
  type ContentLayout,
  NAVBAR_STYLE_OPTIONS,
  type NavbarStyle,
  SIDEBAR_COLLAPSIBLE_OPTIONS,
  SIDEBAR_VARIANT_OPTIONS,
  type SidebarCollapsible,
  type SidebarVariant,
} from '@/lib/preferences/layout'
import {
  applyContentLayout,
  applyFont,
  applyNavbarStyle,
  applySidebarCollapsible,
  applySidebarVariant,
} from '@/lib/preferences/layout-utils'
import { PREFERENCE_DEFAULTS } from '@/lib/preferences/preferences-config'
import { persistPreference } from '@/lib/preferences/preferences-storage'
import { THEME_MODE_OPTIONS, THEME_PRESET_OPTIONS, type ThemeMode, type ThemePreset } from '@/lib/preferences/theme'
import { applyThemePreset } from '@/lib/preferences/theme-utils'
import { usePreferencesStore } from '@/stores/preferences/preferences-provider'

export function SettingsPage() {
  const themeMode = usePreferencesStore((s) => s.themeMode)
  const resolvedThemeMode = usePreferencesStore((s) => s.resolvedThemeMode)
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode)
  const themePreset = usePreferencesStore((s) => s.themePreset)
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset)

  const font = usePreferencesStore((s) => s.font)
  const setFont = usePreferencesStore((s) => s.setFont)

  const contentLayout = usePreferencesStore((s) => s.contentLayout)
  const setContentLayout = usePreferencesStore((s) => s.setContentLayout)

  const navbarStyle = usePreferencesStore((s) => s.navbarStyle)
  const setNavbarStyle = usePreferencesStore((s) => s.setNavbarStyle)

  const sidebarVariant = usePreferencesStore((s) => s.sidebarVariant)
  const setSidebarVariant = usePreferencesStore((s) => s.setSidebarVariant)

  const sidebarCollapsible = usePreferencesStore((s) => s.sidebarCollapsible)
  const setSidebarCollapsible = usePreferencesStore((s) => s.setSidebarCollapsible)

  const onThemePresetChange = async (preset: ThemePreset) => {
    applyThemePreset(preset)
    setThemePreset(preset)
    persistPreference('theme_preset', preset)
  }

  const onThemeModeChange = async (mode: ThemeMode | '') => {
    if (!mode) return
    setThemeMode(mode)
    persistPreference('theme_mode', mode)
  }

  const onFontChange = async (value: FontKey) => {
    applyFont(value)
    setFont(value)
    persistPreference('font', value)
  }

  const onContentLayoutChange = async (layout: ContentLayout | '') => {
    if (!layout) return
    applyContentLayout(layout)
    setContentLayout(layout)
    persistPreference('content_layout', layout)
  }

  const onNavbarStyleChange = async (style: NavbarStyle | '') => {
    if (!style) return
    applyNavbarStyle(style)
    setNavbarStyle(style)
    persistPreference('navbar_style', style)
  }

  const onSidebarVariantChange = async (variant: SidebarVariant | '') => {
    if (!variant) return
    applySidebarVariant(variant)
    setSidebarVariant(variant)
    persistPreference('sidebar_variant', variant)
  }

  const onSidebarCollapsibleChange = async (value: SidebarCollapsible | '') => {
    if (!value) return
    applySidebarCollapsible(value)
    setSidebarCollapsible(value)
    persistPreference('sidebar_collapsible', value)
  }

  const handleRestoreDefaults = async () => {
    await onThemePresetChange(PREFERENCE_DEFAULTS.theme_preset)
    await onThemeModeChange(PREFERENCE_DEFAULTS.theme_mode)

    await onFontChange(PREFERENCE_DEFAULTS.font)
    await onContentLayoutChange(PREFERENCE_DEFAULTS.content_layout)
    await onNavbarStyleChange(PREFERENCE_DEFAULTS.navbar_style)
    await onSidebarVariantChange(PREFERENCE_DEFAULTS.sidebar_variant)
    await onSidebarCollapsibleChange(PREFERENCE_DEFAULTS.sidebar_collapsible)
  }

  return (
    <div className='@container/main flex flex-col gap-6'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <Settings2 className='size-4 text-muted-foreground' />
            <h1 className='font-semibold text-lg leading-none'>Settings</h1>
          </div>
          <p className='text-muted-foreground text-sm'>Manage appearance and layout preferences for this dashboard.</p>
        </div>
        <Button variant='outline' onClick={handleRestoreDefaults} className='shrink-0'>
          <Undo2 />
          Restore defaults
        </Button>
      </div>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
        <Card className='shadow-xs'>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Theme mode, preset, and typography.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-2'>
              <Label className='font-medium text-sm'>Theme preset</Label>
              <Select value={themePreset} onValueChange={onThemePresetChange}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Preset' />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESET_OPTIONS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      <span
                        className='size-2.5 rounded-full'
                        style={{
                          backgroundColor:
                            (resolvedThemeMode ?? 'light') === 'dark' ? preset.primary.dark : preset.primary.light,
                        }}
                      />
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-muted-foreground text-xs'>Preset controls your color palette, radius, and shadows.</p>
            </div>

            <Separator />

            <div className='space-y-2'>
              <Label className='font-medium text-sm'>Theme mode</Label>
              <ToggleGroup type='single' variant='outline' value={themeMode} onValueChange={onThemeModeChange}>
                {THEME_MODE_OPTIONS.map((opt) => (
                  <ToggleGroupItem key={opt.value} value={opt.value} aria-label={`Theme ${opt.label}`}>
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className='text-muted-foreground text-xs'>System follows your OS preference.</p>
            </div>

            <Separator />

            <div className='space-y-2'>
              <Label className='font-medium text-sm'>Font</Label>
              <Select value={font} onValueChange={onFontChange}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select font' />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-muted-foreground text-xs'>Font applies across the entire app via preferences.</p>
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs'>
          <CardHeader>
            <CardTitle>Layout</CardTitle>
            <CardDescription>How content, navbar, and sidebar behave.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-2'>
              <Label className='font-medium text-sm'>Page layout</Label>
              <ToggleGroup type='single' variant='outline' value={contentLayout} onValueChange={onContentLayoutChange}>
                {CONTENT_LAYOUT_OPTIONS.map((opt) => (
                  <ToggleGroupItem key={opt.value} value={opt.value} aria-label={`Layout ${opt.label}`}>
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className='space-y-2'>
              <Label className='font-medium text-sm'>Navbar behavior</Label>
              <ToggleGroup type='single' variant='outline' value={navbarStyle} onValueChange={onNavbarStyleChange}>
                {NAVBAR_STYLE_OPTIONS.map((opt) => (
                  <ToggleGroupItem key={opt.value} value={opt.value} aria-label={`Navbar ${opt.label}`}>
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className='space-y-2'>
              <Label className='font-medium text-sm'>Sidebar style</Label>
              <ToggleGroup
                type='single'
                variant='outline'
                value={sidebarVariant}
                onValueChange={onSidebarVariantChange}
              >
                {SIDEBAR_VARIANT_OPTIONS.map((opt) => (
                  <ToggleGroupItem key={opt.value} value={opt.value} aria-label={`Sidebar ${opt.label}`}>
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className='space-y-2'>
              <Label className='font-medium text-sm'>Sidebar collapse mode</Label>
              <ToggleGroup
                type='single'
                variant='outline'
                value={sidebarCollapsible}
                onValueChange={onSidebarCollapsibleChange}
              >
                {SIDEBAR_COLLAPSIBLE_OPTIONS.map((opt) => (
                  <ToggleGroupItem key={opt.value} value={opt.value} aria-label={`Collapse ${opt.label}`}>
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <p className='text-muted-foreground text-xs'>
              Preferences are stored using the configured persistence (cookies by default).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
