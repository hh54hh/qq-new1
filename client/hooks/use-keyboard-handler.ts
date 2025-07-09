import { useEffect, useState, useCallback } from "react";

interface KeyboardState {
  isVisible: boolean;
  height: number;
  isSupported: boolean;
}

export function useKeyboardHandler() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    isSupported: false,
  });

  // فحص دعم Virtual Keyboard API
  const isVirtualKeyboardSupported = useCallback(() => {
    return "virtualKeyboard" in navigator;
  }, []);

  // فحص إذا كان الجهاز محمول
  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }, []);

  // معالجة تغيي�� حجم النافذة (للكيبورد على الأجهزة المحمولة)
  const handleResize = useCallback(() => {
    if (!isMobile()) return;

    const currentHeight = window.innerHeight;
    const viewportHeight = window.screen.height;

    // تقدير ظهور الكيبورد على أساس تغير الارتفاع
    const heightDifference = viewportHeight - currentHeight;
    const keyboardThreshold = 150; // الحد الأدنى لاعتبار الكيبورد ظاهر

    const isKeyboardVisible = heightDifference > keyboardThreshold;
    const keyboardHeight = isKeyboardVisible ? heightDifference : 0;

    setKeyboardState((prev) => ({
      ...prev,
      isVisible: isKeyboardVisible,
      height: keyboardHeight,
    }));
  }, [isMobile]);

  // معالجة Visual Viewport API (للمتصفحات المدعومة)
  const handleVisualViewportChange = useCallback(() => {
    if (!window.visualViewport) return;

    const viewport = window.visualViewport;
    const isKeyboardVisible = viewport.height < window.innerHeight;
    const keyboardHeight = window.innerHeight - viewport.height;

    setKeyboardState((prev) => ({
      ...prev,
      isVisible: isKeyboardVisible,
      height: keyboardHeight,
    }));
  }, []);

  // معالجة Virtual Keyboard API (أحدث API)
  const handleVirtualKeyboard = useCallback(() => {
    if (!isVirtualKeyboardSupported()) return;

    const vk = (navigator as any).virtualKeyboard;

    const handleShow = () => {
      setKeyboardState((prev) => ({
        ...prev,
        isVisible: true,
      }));
    };

    const handleHide = () => {
      setKeyboardState((prev) => ({
        ...prev,
        isVisible: false,
        height: 0,
      }));
    };

    vk.addEventListener("geometrychange", handleVisualViewportChange);

    return () => {
      vk.removeEventListener("geometrychange", handleVisualViewportChange);
    };
  }, [isVirtualKeyboardSupported, handleVisualViewportChange]);

  // تثبيت مستمعي الأحداث
  useEffect(() => {
    setKeyboardState((prev) => ({
      ...prev,
      isSupported: isVirtualKeyboardSupported() || !!window.visualViewport,
    }));

    // استخدام Virtual Keyboard API إذا كان متاح
    if (isVirtualKeyboardSupported()) {
      const cleanup = handleVirtualKeyboard();
      return cleanup;
    }

    // استخدام Visual Viewport API إذا كان متاح
    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        handleVisualViewportChange,
      );
      return () => {
        window.visualViewport?.removeEventListener(
          "resize",
          handleVisualViewportChange,
        );
      };
    }

    // الرجوع إلى مراقبة تغيير حجم النافذة
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [
    isVirtualKeyboardSupported,
    handleVirtualKeyboard,
    handleVisualViewportChange,
    handleResize,
  ]);

  // وظائف مساعدة
  const preventBackgroundScroll = useCallback(() => {
    if (keyboardState.isVisible) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
  }, [keyboardState.isVisible]);

  // تطبيق منع التمرير
  useEffect(() => {
    preventBackgroundScroll();
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [preventBackgroundScroll]);

  // إضافة متغيرات CSS للارتفاع
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--keyboard-height",
      `${keyboardState.height}px`,
    );
    document.documentElement.style.setProperty(
      "--keyboard-visible",
      keyboardState.isVisible ? "1" : "0",
    );
  }, [keyboardState.height, keyboardState.isVisible]);

  return {
    ...keyboardState,
    isMobile: isMobile(),
    preventBackgroundScroll,
  };
}
