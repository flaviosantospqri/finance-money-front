type UserAvatarProps = {
  name: string
  photo: string | null
  className?: string
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('pt-BR')).join('') || '?'
}

export function UserAvatar({ name, photo, className = '' }: UserAvatarProps) {
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </span>
  )
}
