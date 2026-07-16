declare global {
  function toastConfirm(message: string): Promise<boolean>;
}

export {};
