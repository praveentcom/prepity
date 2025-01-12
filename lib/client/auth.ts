import axios from 'axios';
import Router from 'next/router';

export async function logout() {
  await axios.post('/api/auth/logout');
  Router.push('/auth/login');
} 