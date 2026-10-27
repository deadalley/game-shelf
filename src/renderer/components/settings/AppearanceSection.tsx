import type { ColorMode } from '@shared/types'
import { useLibrary } from '../../state/useLibrary'
import { Segmented, ThemePicker, WrapperPicker } from '../LayoutPicker'
import { SettingRow, Switch } from './SettingsPage'

const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
]

export function AppearanceSection(): JSX.Element {
  const s = useLibrary((st) => st.settings)
  const update = useLibrary((st) => st.updateSettings)
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
        <SettingRow title="Cover size" description={`${s.coverSize}px wide`}>
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
