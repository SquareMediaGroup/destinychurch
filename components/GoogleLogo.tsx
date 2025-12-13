type GoogleLogoProps = {
  size?: number;
  className?: string;
};

export default function GoogleLogo({ size = 18, className }: GoogleLogoProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
    >
      <path fill="#4285F4" d="M43.6 24.5c0-1.6-.1-2.8-.4-4.1H24v7.5h11.1c-.2 1.9-1.5 4.7-4.4 6.6l-.04.2 6.4 5 0.4.1c3.7-3.5 6-8.6 6-14.8z" />
      <path fill="#34A853" d="M24 44c5.4 0 9.9-1.8 13.2-4.7l-6.4-5.1c-1.7 1.2-4 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2l-.23.02-6.7 5.2-.09.2C9.3 39.6 16 44 24 44z" />
      <path fill="#FBBC05" d="M12.8 28c-.4-1.2-.7-2.5-.7-4s.3-2.8.7-4l-.01-.27-6.8-5.3-.22.1C4.7 17 4 20.4 4 24s.7 7 1.9 9.5l6.9-5.5z" />
      <path fill="#EA4335" d="M24 12c3.8 0 6.4 1.6 7.8 2.9l5.7-5.6C33.9 5.9 29.4 4 24 4 16 4 9.3 8.4 5.9 14.5l6.9 5.5C14.4 15.5 18.8 12 24 12z" />
    </svg>
  );
}
