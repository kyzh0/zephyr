import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

import emailjs from '@emailjs/browser';

export default function Site() {
  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    if (loading) {
      return;
    }

    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    setErrorMsg('');
    setEmailError(false);
    setMessageError(false);

    const data = new FormData(e.currentTarget);
    const email = data.get('user_email').trim();
    const message = data.get('message').trim();

    // input validation
    const regex =
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;
    if (!email.match(regex)) {
      setEmailError(true);
      setErrorMsg('Email is not valid');
      setLoading(false);
      return;
    }
    if (message.length < 20) {
      setMessageError(true);
      setErrorMsg('Minimum 20 characters');
      setLoading(false);
      return;
    } else if (message.length > 5000) {
      setMessageError(true);
      setErrorMsg('Maximum 5000 characters');
      setLoading(false);
      return;
    }

    try {
      await emailjs.sendForm(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        e.target,
        { publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY }
      );

      setLoading(false);
      setSuccess(true);

      // const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      // await sleep(3000);
      // handleClose();
    } catch (error) {
      setLoading(false);
      setMessageError(true);
      setErrorMsg('Something went wrong, please try again.');
    }
  }

  return (
    <Modal open onClose={handleClose}>
      <Container component="main" maxWidth="xs" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}
          >
            <Stack direction="row-reverse" sx={{ width: '100%' }}>
              <IconButton sx={{ p: 0 }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            {success ? (
              <Stack direction="column" justifyContent="center" alignItems="center">
                <CheckIcon sx={{ color: '#9aff8a', width: '128px', height: '128px' }} />
                <Typography component="h1" variant="h5">
                  Message sent
                </Typography>
                <Typography component="h1" variant="h5">
                  Thanks for your feedback!
                </Typography>
              </Stack>
            ) : (
              <>
                <Typography component="h1" variant="h5">
                  Contact
                </Typography>
                <Typography variant="subtitle2">
                  Got feedback, or want a weather station added?
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                  <TextField
                    margin="normal"
                    fullWidth
                    id="email"
                    label="Email"
                    name="user_email"
                    autoComplete="email"
                    error={emailError}
                    helperText={emailError && errorMsg}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    name="message"
                    label="Message"
                    id="message"
                    multiline
                    rows={3}
                    error={messageError}
                    helperText={messageError && errorMsg}
                  />
                  <LoadingButton
                    loading={loading}
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{
                      marginTop: '12px',
                      marginBottom: '12px',
                      height: '50px',
                      boxShadow: 'none'
                    }}
                  >
                    Send
                  </LoadingButton>
                </Box>
              </>
            )}
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
