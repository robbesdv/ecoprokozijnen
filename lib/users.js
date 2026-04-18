// Gebruikers configuratie
// Wachtwoorden instellen via environment variables voor veiligheid

export const USERS = [
  {
    username: 'ecopro',
    passwordEnv: 'ADMIN_PASSWORD',
    role: 'admin',
    name: 'EcoPro Admin',
  },
  {
    username: 'rudy',
    passwordEnv: 'MONTEUR_PASSWORD_RUDY',
    role: 'monteur',
    name: 'Rudy',
    team: 'Rudy en team',
  },
  {
    username: 'vida',
    passwordEnv: 'MONTEUR_PASSWORD_VIDA',
    role: 'monteur',
    name: 'Vida Kozijnen',
    team: 'Vida Kozijnen',
  },
  {
    username: 'matthew',
    passwordEnv: 'MONTEUR_PASSWORD_MATTHEW',
    role: 'monteur',
    name: 'Matthew',
    team: 'Matthew',
  },
  {
    username: 'kay',
    passwordEnv: 'MONTEUR_PASSWORD_KAY',
    role: 'monteur',
    name: 'Kay',
    team: 'Kay',
  },
]

export const MONTEURS = USERS.filter(u => u.role === 'monteur')