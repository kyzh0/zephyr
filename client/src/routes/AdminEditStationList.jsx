import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listStations } from '../services/stationService';
import Fuse from 'fuse.js';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

export default function AdminEditStation() {
  const [stations, setStations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (stations.length) return;

    async function load() {
      const s = await listStations();
      if (s.length) {
        setStations(s);
        setSearchResults(s);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!stations.length) return;

    if (!searchText) {
      setSearchResults(stations);
      return;
    }

    const options = {
      ignoreDiacritics: true,
      findAllMatches: true,
      keys: ['name'],
      threshold: 0.2
    };
    const fuse = new Fuse(stations, options);
    const result = fuse.search(searchText);
    setSearchResults(
      result.map((el) => {
        return {
          _id: el.item._id,
          name: el.item.name
        };
      })
    );
  }, [searchText]);

  const navigate = useNavigate();
  function handleClose() {
    navigate('/');
  }

  return (
    <Modal open onClose={handleClose} disableAutoFocus={true}>
      <Container component="main" maxWidth="xs" sx={{ height: '100%' }}>
        <Stack direction="column" justifyContent="center" sx={{ height: '100%' }}>
          <Stack
            direction="column"
            alignItems="center"
            sx={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}
          >
            <Stack direction="row" justifyContent="end" sx={{ width: '100%' }}>
              <IconButton sx={{ p: 0 }} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Typography component="h1" variant="h5">
              Stations
            </Typography>
            <Typography component="p" variant="subtitle2" sx={{ mb: 2 }}>
              {searchResults.length} results
            </Typography>
            <TextField
              label="Name"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Box sx={{ maxHeight: '70vh', overflowY: 'scroll' }}>
              <List disablePadding>
                {searchResults.length ? (
                  searchResults.map((station) => {
                    return (
                      <ListItem
                        disablePadding
                        key={station._id}
                        onClick={() => navigate(`/admin/edit-station/${station._id}`)}
                      >
                        <ListItemButton>
                          <Stack
                            direction="row"
                            justifyContent="left"
                            alignItems="center"
                            gap="24px"
                            sx={{ width: '100%' }}
                          >
                            <Stack direction="column">
                              <Typography noWrap>{station.name}</Typography>
                            </Stack>
                            <Box sx={{ flex: '1 0 auto' }} />
                            <KeyboardArrowRightIcon />
                          </Stack>
                        </ListItemButton>
                      </ListItem>
                    );
                  })
                ) : (
                  <ListItem>
                    <Typography>No results</Typography>
                  </ListItem>
                )}
              </List>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Modal>
  );
}
