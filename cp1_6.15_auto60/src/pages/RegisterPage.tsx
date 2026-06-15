import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, error } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [emailError, setEmailError] = useState(false)

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmail(email)) {
      setEmailError(true)
      return
    }
    
    setEmailError(false)
    const success = await register(email, password, name)
    if (success) {
      navigate('/')
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (emailError && validateEmail(e.target.value)) {
      setEmailError(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>创建账号</h1>
          <p style={styles.subtitle}>加入我们，发现更多精彩演出</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>昵称</label>
            <input
              type="text"
              style={styles.input}
              placeholder="请输入昵称"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>邮箱</label>
            <input
              type="email"
              style={{
                ...styles.input,
                borderColor: emailError ? 'var(--error-color)' : undefined
              }}
              className={emailError ? 'shake' : ''}
              placeholder="请输入邮箱地址"
              value={email}
              onChange={handleEmailChange}
            />
            {emailError && (
              <p style={styles.fieldError}>请输入正确的邮箱格式</p>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>密码</label>
            <input
              type="password"
              style={styles.input}
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            style={styles.submitBtn}
            disabled={loading || !name || !email || !password}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>已有账号？</span>
          <Link to="/login" style={styles.footerLink}>立即登录</Link>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, var(--bg-color), var(--bg-dark))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'white',
    borderRadius: 16,
    padding: '40px 32px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
  },
  header: {
    textAlign: 'center',
    marginBottom: 32
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--dark-color)',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-light)'
  },
  form: {
    marginBottom: 24
  },
  field: {
    marginBottom: 20
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-color)',
    marginBottom: 8
  },
  input: {
    width: '100%',
    height: 44,
    padding: '0 16px',
    border: '1px solid #ddd',
    borderRadius: 10,
    fontSize: 14,
    transition: 'border-color 0.2s ease-out, box-shadow 0.2s ease-out'
  },
  fieldError: {
    fontSize: 12,
    color: 'var(--error-color)',
    marginTop: 6
  },
  submitBtn: {
    width: '100%',
    height: 48,
    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 10,
    transition: 'filter 0.2s ease-out'
  },
  footer: {
    textAlign: 'center',
    fontSize: 14
  },
  footerText: {
    color: 'var(--text-light)'
  },
  footerLink: {
    color: 'var(--primary-color)',
    textDecoration: 'none',
    marginLeft: 4,
    fontWeight: 500
  }
}
