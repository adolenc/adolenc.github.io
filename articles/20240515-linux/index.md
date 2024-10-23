My Linux Setup (2024)
=====================
- i started using linux all the way back in high-school, about 15 years ago
- i started with Arch linux, which was all the rage back then
- while it was a good learning experience, it also scarred me a little - it seemed like every other week after running package manager update some other thing would break and i would need to spend time fixing it
- instead of just loving package managers, i got a bit scared of them
- i used debian testing 10 years, accidentally switched to unstable once and couldnt really go back
- package managers are great but afraid to update my system to not break anything is a big no-no

## Not Immutable, But Easily Disposable
- i knew i wanted something where i wouldnt be scared of updating my system, and it would just work
- in the last decade a couple of ideas have really turned the linux world on its head (probably before, but the ideas have started catching on)
- docker, immutability, flatpak/snap, appimage
- nix seems like a lot of effort to figure out
- fedora silverblue seemed like a solid compromise, except it wouldnt install in virtualbox, and it didn't want to boot from the usb on the actual HW
- even if it did, even something as simple as changing a keyboard layout seems like an insane amount of work
- i decided on a compromise

- picture of the setup [debian stable [distrobox] [flatpaks] [appimages/binaries in ~/bin/]]

## The Actual Setup
- debian stable
  - tmpfs with half of ram
  - no swap
  - oom killer
  - pulseaudio
  - X.org
  - ssh (ssh localhost -t "zsh --login -c 'distrobox enter ubuntu22.04'")
  - colemak keyboard layout (where is it defined)
  - i3
  - nvidia drivers
  - nmtui
  - yadm for dotfiles
  - kitty terminal
    - zsh
      - copilot: https://x.com/arjie/status/1575201117595926530?t=K_8J6rG18DrV5bcCLDrrYw , and in zshrc: EDITOR=, autoload edit-command-line; zle -N edit-command-line; bindkey -M vicmd v edit-command-line
    - fzf
  - docker
- distrobox with ubuntu installed 
  - install command (with nvidia cuda)
  - binding in i3 for new terminal
    - to get the full integration with kitty inside distrobox, you need to use the hack described at [kitty documentation](https://github.com/kovidgoyal/kitty/blob/master/docs/shell-integration.rst#shell-integration-in-a-container)
    - in short, download kitten-linux-amd64 into the $PATH, chmod +x it, and then use the following keybinding in `.i3/config`:
    - `bindsym $mod+Shift+Return exec "kitty sh -c 'distrobox enter ubuntu22.04 -- /home/a3/bin/kitten-linux-amd64 run-shell --shell=/bin/zsh'"`
    - with this, mod+shift+return will create a new window with the distrobox running, and everything related to kitty will automatically work (including ctrl+shift+g for to put the last executed command into the pager)
  - "n" alias for new terminal in current directory
  - passthrough to host os
  - how to destroy a container
  - how does docker work
- flatpak for gui apps that should be updated all the time
  - flatpak ~/bin/ scripts
  - flatpak permissions app (add xdg-config/mpv:ro to access files in $XDG_CONFIG_HOME/mpv)
  - updating flatpaks
  - steam & proton
  - download folders default to tmpfs
- appimages in ~/bin/

## Conclusion
- solid setup, debian stable is pretty much unbreakable, and the containers themselves are disposable, so i can't apt-get mess my setup up
