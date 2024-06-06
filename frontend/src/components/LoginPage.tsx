import React, { useState } from 'react';

import { signInWithEmailAndPassword } from 'firebase/auth';
import {Box, Button, Stack, TextField, Typography} from '@mui/material';
import useAuthenticationContext from "../hooks/useAuthenticationContext.tsx";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { auth } = useAuthenticationContext()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Stack display="flex" justifyContent="center" alignItems="center" spacing={1}>
        <Typography variant="h4">Login</Typography>
        {error && <Typography color="error">{error}</Typography>}
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" color="primary" onClick={handleSubmit}>
          Login
        </Button>
      </Stack>
    </Box>
  );
};

export default LoginPage;
