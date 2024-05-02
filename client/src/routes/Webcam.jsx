import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { getCamById, loadCamImages } from '../services/camService';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import { alpha } from '@mui/material';

import 'react-responsive-carousel/lib/styles/carousel.min.css';
import './Webcam.css';
import { Carousel } from 'react-responsive-carousel';
import { format } from 'date-fns';

import { APIROOT } from '../constants';

export default function Webcam() {
  const { id } = useParams();
  const [webcam, setWebcam] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { refreshedWebcams } = useContext(AppContext);
  const [initialLoad, setInitialLoad] = useState(true);

  async function fetchData() {
    try {
      const cam = await getCamById(id);
      if (!cam) navigate('/');
      setWebcam(cam);
      if (Date.now() - new Date(cam.currentTime).getTime() >= 24 * 60 * 60 * 1000) return;

      const images = await loadCamImages(id);
      images.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()); // time asc
      setImages(images);
      setSelectedIndex(images.length - 1);
    } catch (error) {
      console.error(error);
    }
  }

  // initial load
  useEffect(() => {
    if (!id) return;

    try {
      setInitialLoad(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  // on refresh trigger (ignore initial load)
  useEffect(() => {
    if (!id || initialLoad || !refreshedWebcams || !refreshedWebcams.includes(id)) return;

    try {
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }, [id, refreshedWebcams]);

  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  const bigScreen = window.matchMedia('(min-width: 1000px)').matches;

  return (
    <Modal open onClose={handleClose} disableAutoFocus={true}>
      <Container component="main" maxWidth="xl" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px'
            }}
          >
            <Stack direction="row" sx={{ width: '100%' }}>
              <Stack direction="column" alignItems="center" sx={{ width: '100%', ml: 3 }}>
                {webcam ? (
                  <Typography component="h1" variant="h5" align="center">
                    {webcam.name}
                  </Typography>
                ) : (
                  <Skeleton
                    width="180px"
                    height="50px"
                    sx={{ backgroundColor: alpha('#a8a8a8', 0.1), transform: 'none' }}
                  />
                )}
              </Stack>
              <IconButton sx={{ p: 0, width: '24px', height: '24px' }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            {webcam ? (
              Date.now() - new Date(webcam.currentTime).getTime() >= 24 * 60 * 60 * 1000 ? (
                <Typography component="h1" variant="h5" sx={{ mt: 2, color: 'red' }}>
                  No images in the last 24h.
                </Typography>
              ) : images.length ? (
                <Box
                  sx={{
                    width: '80vw',
                    height: '50vw',
                    maxWidth: '800px',
                    maxHeight: bigScreen ? '480px' : '50vw'
                  }}
                >
                  <Carousel
                    showIndicators={false}
                    showThumbs={false}
                    transitionTime={0}
                    selectedItem={images.length - 1}
                    style={{ maxHeight: 'inherit', maxWidth: 'inherit' }}
                    onChange={(index) => setSelectedIndex(index)}
                  >
                    {images.map((img, index) => {
                      if (
                        index === selectedIndex ||
                        index === selectedIndex - 1 ||
                        index === selectedIndex + 1 ||
                        img.loaded
                      ) {
                        img.loaded = true;
                        return (
                          <div key={img.time}>
                            <img width="100%" src={`${APIROOT}/${img.url}`} />
                            <p style={{ margin: 0 }}>
                              {format(new Date(img.time), 'dd MMM HH:mm')}
                            </p>
                          </div>
                        );
                      } else {
                        return <div key={img.time} />;
                      }
                    })}
                  </Carousel>
                </Box>
              ) : (
                <Skeleton
                  width="100%"
                  height="40vh"
                  sx={{ backgroundColor: alpha('#a8a8a8', 0.1), transform: 'none', mb: 2, mt: 2 }}
                />
              )
            ) : (
              <Skeleton
                width="100%"
                height="40vh"
                sx={{ backgroundColor: alpha('#a8a8a8', 0.1), transform: 'none', mb: 2, mt: 2 }}
              />
            )}

            <Stack direction="row" justifyContent="end" sx={{ width: '100%' }}>
              {webcam && (
                <Link
                  href={webcam.externalLink}
                  target="_blank"
                  rel="noreferrer"
                  variant="subtitle2"
                >
                  Source:{' '}
                  {webcam.type === 'lw'
                    ? 'Lake Wanaka'
                    : webcam.type === 'qa'
                      ? 'Queenstown Airport'
                      : webcam.type === 'wa'
                        ? 'Wanaka Airport'
                        : webcam.type === 'cgc'
                          ? 'Canterbury Gliding Club'
                          : webcam.type === 'ch'
                            ? 'Castle Hill'
                            : webcam.type === 'cm'
                              ? 'Mt Cheeseman'
                              : webcam.type === 'cwu'
                                ? 'Canterbury Weather Updates'
                                : webcam.type === 'ts'
                                  ? 'Taylors Surf'
                                  : webcam.type.charAt(0).toUpperCase() + webcam.type.slice(1)}
                </Link>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
