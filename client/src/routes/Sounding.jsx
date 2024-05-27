import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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

import { FILESERVERROOT } from '../helpers/constants';
import { getSoundingById } from '../services/soundingService';

export default function Sounding() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sounding, setSounding] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  async function fetchData() {
    try {
      const sounding = await getSoundingById(id);
      if (!sounding) navigate('/');
      setSounding(sounding);

      if (!sounding.images.length) return;

      sounding.images.sort((a, b) => {
        return new Date(a.time).getTime() - new Date(b.time).getTime();
      });
      const afterDates = sounding.images.filter((img) => {
        return new Date(img.time).getTime() - (Date.now() - 30 * 60 * 1000) > 0;
      });

      if (afterDates && afterDates.length) {
        setSelectedIndex(sounding.images.findIndex((img) => img._id === afterDates[0]._id));
      } else {
        setSelectedIndex(sounding.images.length - 1);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // initial load
  useEffect(() => {
    if (!id) return;

    try {
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  function handleClose() {
    navigate('/');
  }

  const bigScreen = window.matchMedia('(min-width: 900px)').matches;

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
                {sounding ? (
                  <Typography component="h1" variant="h5" align="center">
                    {sounding.name}
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
            {sounding ? (
              sounding.images.length ? (
                <Box
                  sx={{
                    maxWidth: bigScreen ? '690px' : '80vw'
                  }}
                >
                  <Carousel
                    showIndicators={false}
                    showThumbs={false}
                    transitionTime={0}
                    selectedItem={selectedIndex}
                    style={{ maxHeight: 'inherit', maxWidth: 'inherit' }}
                    onChange={(index) => setSelectedIndex(index)}
                  >
                    {sounding.images.map((img, index) => {
                      if (
                        index === selectedIndex ||
                        index === selectedIndex - 1 ||
                        index === selectedIndex + 1 ||
                        img.loaded
                      ) {
                        img.loaded = true;
                        return (
                          <div key={img.time}>
                            <img height="100%" src={`${FILESERVERROOT}/${img.url}`} />
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
                <Typography component="h1" variant="h5" sx={{ mt: 2, color: 'red' }}>
                  Error retrieving today&#39;s soundings.
                </Typography>
              )
            ) : (
              <Skeleton
                width="100%"
                height="40vh"
                sx={{ backgroundColor: alpha('#a8a8a8', 0.1), transform: 'none', mb: 2, mt: 2 }}
              />
            )}

            <Stack direction="row" justifyContent="end" sx={{ width: '100%' }}>
              {sounding && (
                <Link
                  href={`http://rasp.nz/rasp/view.php?region=${sounding.raspRegion}&mod=%2B0&date=${format(sounding.images.length ? new Date(sounding.images[0].time) : new Date(), 'yyyyMMdd')}&all=sounding${sounding.raspId}&section=${sounding.raspRegion}.sounding.params`}
                  target="_blank"
                  rel="noreferrer"
                  variant="subtitle2"
                >
                  Source: RASP
                </Link>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
