import React from "react";
import {Avatar, Badge, Button, IconButton, Stack} from "@mui/material";
import {styled} from "@mui/material/styles";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import {User} from "../model/user";
import {UserVoiceEnroll} from "./UserVoiceEnroll";
import {EagleEnrollContextProvider} from "../contexts/EagleEnrollContext.tsx";

async function hashEmail(email: string) {
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const hashed = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashed));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

export const Users = React.memo(({users, setUsers}: Props) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  return <Stack direction="row" spacing={2} sx={{alignSelf: "end"}}>
    {users
      .map(user => (
        <StyledBadge
          key={user.id}
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
        >
          <Button onMouseDown={handleClick}>
            <Avatar alt={user.name} src={user.picture} />
          </Button>
        </StyledBadge>
      ))
    }
    <IconButton
      onClick={async () => {
        const name = prompt('Enter the name of the user');
        const email = prompt('Enter the email of the user');
        if (name && email) {
          const hashedEmail = await hashEmail(email);
          setUsers(
            [
              {
                id: crypto.randomUUID(),
                name,
                email,
                picture: `https://www.gravatar.com/avatar/${hashedEmail}`,
                voiceProfileId: ""
              },
              ...users,
            ]
          );
        }
      }}
    >
      <AddCircleIcon />
    </IconButton>
    <EagleEnrollContextProvider>
      <UserVoiceEnroll
        user={users[0]}
        setUserVoiceProfileId={(profileId: string) => {
        
        }}
        anchorEl={anchorEl}
        onClose={handleClose}
      />
    </EagleEnrollContextProvider>
  </Stack>
});

interface Props {
  users: User[]
  setUsers: (users: User[]) => void
}
