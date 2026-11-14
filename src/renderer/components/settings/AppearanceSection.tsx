import { DEFAULT_SETTINGS, type ColorMode } from '@shared/types'
import { coverSizePercent } from '../../lib/organize'
import { useLibrary } from '../../state/useLibrary'
import { LAYOUTS, Segmented, ThemePicker, WrapperPicker } from '../LayoutPicker'
import { SettingRow, Switch } from './SettingsPage'

const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
]

export function AppearanceSection(): JSX.Element {
  const s = useLibrary((st) => st.settings)
  const update = useLibrary((st) => st.updateSettings)
  const fullscreen = useLibrary((st) => st.fullscreen)
  const toggleFullscreen = useLibrary((st) => st.toggleFullscreen)
  const setShelfOnly = useLibrary((st) => st.setShelfOnly)
  const acrylic = useLibrary((st) => st.acrylic)
  return (
    <>
      <h3>Shelf</h3>
      <div className="picker-wide">
        <ThemePicker value={s.theme} onChange={(theme) => update({ theme })} />
      </div>
      <h3>Cover style</h3>
      <div className="picker-wide narrow">
        <WrapperPicker value={s.wrapper} onChange={(wrapper) => update({ wrapper })} />
      </div>
      <div className="settings-card">
        <SettingRow
          title="Layout"
          description="Flat shows every cover. Stacked lines games up spine by spine, like cases on a real shelf."
        >
          <Segmented id="set-layout" options={LAYOUTS} value={s.layout} onChange={(layout) => update({ layout })} />
        </SettingRow>
        <SettingRow
          title="Fullscreen"
          description="Fill the whole screen. Also F11, the button in the title bar, or clicking the controller's left stick."
          onClick={() => void toggleFullscreen()}
        >
          <Switch on={fullscreen} onChange={() => void toggleFullscreen()} label="Fullscreen" />
        </SettingRow>
        <SettingRow
          title="Shelf only"
          description="Hide every menu and button so only the shelves are on screen. Bring them back with the button at the top, Esc, or the controller's right stick. Combine with fullscreen to hide the window buttons too."
          onClick={() => setShelfOnly(!s.shelfOnly)}
        >
          <Switch on={s.shelfOnly} onChange={(on) => setShelfOnly(on)} label="Shelf only" />
        </SettingRow>
        <SettingRow
          title="Background transparency"
          description={
            acrylic
              ? `${s.backgroundTransparency}%. Lets your desktop show through, blurred, behind the shelves.`
              : 'Needs Windows 11 (version 22H2 or later).'
          }
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={acrylic ? s.backgroundTransparency : 0}
            disabled={!acrylic}
            onChange={(e) => update({ backgroundTransparency: Number(e.target.value) })}
            aria-label="Background transparency"
            style={{ width: 200 }}
          />
        </SettingRow>
        <SettingRow
          title="Start in fullscreen"
          description="Open GameShelf fullscreen every time it starts."
          onClick={() => update({ startFullscreen: !s.startFullscreen })}
        >
          <Switch
            on={s.startFullscreen}
            onChange={(startFullscreen) => update({ startFullscreen })}
            label="Start in fullscreen"
          />
        </SettingRow>
        <SettingRow title="Color mode" description="Applies to the app interface. Shelf themes keep their own look.">
          <Segmented
            id="color-mode"
            options={COLOR_MODES}
            value={s.colorMode}
            onChange={(colorMode) => update({ colorMode })}
          />
        </SettingRow>
        <SettingRow
          title="Show titles"
          description="Game names under each cover."
          onClick={() => update({ showTitles: !s.showTitles })}
        >
          <Switch on={s.showTitles} onChange={(showTitles) => update({ showTitles })} label="Show titles" />
        </SettingRow>
        <SettingRow
          title="Show hours played"
          description="Only for launchers that report playtime, and games GameShelf starts itself."
          onClick={() => update({ showPlaytime: !s.showPlaytime })}
        >
          <Switch on={s.showPlaytime} onChange={(showPlaytime) => update({ showPlaytime })} label="Show hours played" />
        </SettingRow>
        <SettingRow
          title="Cover size"
          description={`${coverSizePercent(s.coverSize)}%${s.coverSize === DEFAULT_SETTINGS.coverSize ? ' (default)' : ''}`}
        >
          <input
            type="range"
            min={100}
            max={240}
            step={5}
            value={s.coverSize}
            onChange={(e) => update({ coverSize: Number(e.target.value) })}
            aria-label="Cover size"
            style={{ width: 200 }}
          />
        </SettingRow>
        <SettingRow
          title="Animations"
          description="Card motion, hover tilt and transitions. Turn off for a calmer, faster interface."
          onClick={() => update({ animations: !s.animations })}
        >
          <Switch on={s.animations} onChange={(animations) => update({ animations })} label="Animations" />
        </SettingRow>
      </div>
    </>
  )
}
