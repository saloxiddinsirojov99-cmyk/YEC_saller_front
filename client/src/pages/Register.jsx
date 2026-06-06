import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { getBranches } from '../services/api';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Business,
  AssignmentInd,
  HowToReg
} from '@mui/icons-material';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('seller');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Validation touch states
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await getBranches();
        setBranches(data || []);
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };
    fetchBranches();
  }, []);

  const isEmailValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const nameError = nameTouched && !name;
  const emailError = emailTouched && !email;
  const emailInvalid = emailTouched && email && !isEmailValid(email);
  const passwordError = passwordTouched && !password;
  const passwordTooShort = passwordTouched && password && password.length < 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!name || !email || !password || !role || !isEmailValid(email) || password.length < 6) {
      setError('Iltimos, barcha maydonlarni to\'g\'ri to\'ldiring.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

      const apiUrl = import.meta.env.VITE_API_URL 
        || (import.meta.env.PROD 
            ? 'https://yec-seller.vercel.app/api' 
            : 'http://localhost:5000/api');
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          branch_id: branchId ? parseInt(branchId) : null
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || json.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi.');
      }

      setSuccessMsg('Muvaffaqiyatli ro\'yxatdan o\'tildi! Kirish sahifasiga yo\'naltirilmoqda...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err?.message || 'Ro\'yxatdan o\'tishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative',
        overflow: 'hidden',
        py: 4,
        px: 2,
      }}
    >
      {/* Decorative blurred neon circles */}
      <Box
        sx={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'rgba(37, 99, 235, 0.15)',
          filter: 'blur(90px)',
          top: '10%',
          left: '15%',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          filter: 'blur(80px)',
          bottom: '10%',
          right: '15%',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.5px',
              mb: 0.5,
              textAlign: 'center',
            }}
          >
            Ro'yxatdan O'tish
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              mb: 3,
              textAlign: 'center',
            }}
          >
            YEC Gilam Boshqaruv Tizimi
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                width: '100%',
                mb: 3,
                borderRadius: 2,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '& .MuiAlert-icon': { color: '#f87171' },
              }}
            >
              {error}
            </Alert>
          )}

          {successMsg && (
            <Alert
              severity="success"
              sx={{
                width: '100%',
                mb: 3,
                borderRadius: 2,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                '& .MuiAlert-icon': { color: '#34d399' },
              }}
            >
              {successMsg}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ width: '100%' }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Ism va Familiya"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              error={nameError}
              helperText={nameError ? 'Ism kiritilishi shart' : ''}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 1.5,
                '& label': { color: 'rgba(255, 255, 255, 0.5)' },
                '& label.Mui-focused': { color: '#3b82f6' },
                '& .MuiInputBase-input': { color: '#fff' },
                '& .MuiFormHelperText-root': { color: '#f87171' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  '&.Mui-error fieldset': { borderColor: '#ef4444' },
                },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              error={emailError || emailInvalid}
              helperText={
                emailError
                  ? 'Email kiritilishi shart'
                  : emailInvalid
                  ? 'Noto\'g\'ri email formati'
                  : ''
              }
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 1.5,
                '& label': { color: 'rgba(255, 255, 255, 0.5)' },
                '& label.Mui-focused': { color: '#3b82f6' },
                '& .MuiInputBase-input': { color: '#fff' },
                '& .MuiFormHelperText-root': { color: '#f87171' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  '&.Mui-error fieldset': { borderColor: '#ef4444' },
                },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Parol (kamida 6 ta belgi)"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              error={passwordError || passwordTooShort}
              helperText={
                passwordError
                  ? 'Parol kiritilishi shart'
                  : passwordTooShort
                  ? 'Parol kamida 6 belgidan iborat bo\'lishi kerak'
                  : ''
              }
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'rgba(255, 255, 255, 0.4)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& label': { color: 'rgba(255, 255, 255, 0.5)' },
                '& label.Mui-focused': { color: '#3b82f6' },
                '& .MuiInputBase-input': { color: '#fff' },
                '& .MuiFormHelperText-root': { color: '#f87171' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  '&.Mui-error fieldset': { borderColor: '#ef4444' },
                },
              }}
            />

            <FormControl
              fullWidth
              sx={{
                mb: 2,
                '& label': { color: 'rgba(255, 255, 255, 0.5)' },
                '& label.Mui-focused': { color: '#3b82f6' },
                '& .MuiSelect-select': { color: '#fff' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.4)' },
              }}
            >
              <InputLabel id="role-label">Rol</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                value={role}
                label="Rol"
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                startAdornment={
                  <InputAdornment position="start" sx={{ mr: 1 }}>
                    <AssignmentInd sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="seller">Sotuvchi (Seller)</MenuItem>
                <MenuItem value="admin">Admin (Administrator)</MenuItem>
              </Select>
            </FormControl>

            <FormControl
              fullWidth
              sx={{
                mb: 3,
                '& label': { color: 'rgba(255, 255, 255, 0.5)' },
                '& label.Mui-focused': { color: '#3b82f6' },
                '& .MuiSelect-select': { color: '#fff' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.4)' },
              }}
            >
              <InputLabel id="branch-label">Filial (ixtiyoriy)</InputLabel>
              <Select
                labelId="branch-label"
                id="branchId"
                value={branchId}
                label="Filial (ixtiyoriy)"
                onChange={(e) => setBranchId(e.target.value)}
                disabled={loading}
                startAdornment={
                  <InputAdornment position="start" sx={{ mr: 1 }}>
                    <Business sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </InputAdornment>
                }
              >
                <MenuItem value=""><em>Hech qaysi</em></MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 1,
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1d4ed8 0%, #1e40af 100%)',
                  boxShadow: '0 6px 20px 0 rgba(37, 99, 235, 0.5)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HowToReg sx={{ fontSize: 18 }} />
                  <span>Ro'yxatdan O'tish</span>
                </Box>
              )}
            </Button>

            <Typography
              variant="body2"
              sx={{
                mt: 2,
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              Hisobingiz bormi?{' '}
              <Button
                component={RouterLink}
                to="/login"
                sx={{
                  color: '#3b82f6',
                  textTransform: 'none',
                  fontWeight: 600,
                  p: 0,
                  minWidth: 'auto',
                  ml: 0.5,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Kirish
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
