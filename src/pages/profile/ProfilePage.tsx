import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { UserProfile } from '../../types'
import { Icon } from '../../components/ui/Icon'
import { UserAvatar } from '../../components/ui/UserAvatar'

type ProfilePageProps = {
  profile: UserProfile
  onSave: (profile: UserProfile) => void
}

const maxPhotoSize = 2 * 1024 * 1024

export function ProfilePage({ profile, onSave }: ProfilePageProps) {
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [photo, setPhoto] = useState(profile.photo)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.')
      return
    }

    if (file.size > maxPhotoSize) {
      setError('A foto deve ter no máximo 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhoto(reader.result)
        setError('')
      }
    }
    reader.onerror = () => setError('Não foi possível carregar a foto. Tente outro arquivo.')
    reader.readAsDataURL(file)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ name: name.trim(), email: email.trim(), photo })
  }

  return (
    <main className="profile-page">
      <form className="profile-card" onSubmit={handleSubmit}>
        <div className="profile-card-heading">
          <div>
            <p className="profile-eyebrow">CONTA</p>
            <h2>Meu perfil</h2>
            <p>Atualize suas informações e a foto exibida na sua conta.</p>
          </div>
        </div>

        <section className="profile-photo-section" aria-labelledby="profile-photo-title">
          <UserAvatar name={name} photo={photo} className="profile-avatar" />
          <div className="profile-photo-copy">
            <h3 id="profile-photo-title">Foto de perfil</h3>
            <p>JPG, PNG ou WebP. Tamanho máximo de 2 MB.</p>
            <div className="profile-photo-actions">
              <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
                <Icon name="edit" size={15} />
                Alterar foto
              </button>
              {photo && <button type="button" className="profile-remove-photo" onClick={() => { setPhoto(null); setError('') }}>Remover</button>}
            </div>
            <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} aria-label="Selecionar foto de perfil" />
          </div>
        </section>

        <section className="profile-fields" aria-label="Informações pessoais">
          <label className="form-field">
            <span>Nome completo</span>
            <input required maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="form-field">
            <span>E-mail</span>
            <input required type="email" maxLength={120} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
        </section>

        {error && <p className="profile-error" role="alert">{error}</p>}

        <footer className="profile-footer">
          <span>As alterações são salvas neste navegador.</span>
          <button type="submit" className="primary-button"><Icon name="check" size={15} />Salvar alterações</button>
        </footer>
      </form>
    </main>
  )
}
