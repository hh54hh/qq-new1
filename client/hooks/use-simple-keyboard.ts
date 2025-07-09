import { useEffect, useState } from "react";

interface KeyboardState {
  isVisible: boolean;
  height: number;
}

export function useSimpleKeyboard() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    // تثبيت مستمع الأحداث للتمرير
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const initialHeight = window.screen.height;

      if (initialHeight - currentHeight > 150) {
        setKeyboardState({
          isVisible: true,
          height: initialHeight - currentHeight,
        });
      } else {
        setKeyboardState({
          isVisible: false,
          height: 0,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return keyboardState;
}
