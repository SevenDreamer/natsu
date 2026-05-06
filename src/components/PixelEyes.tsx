import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    FaceDetection: any;
  }
}

export function PixelEyes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('初始化中...');
  const [error, setError] = useState<string | null>(null);
  const facePositionRef = useRef({ x: 0.5, y: 0.5 });
  const targetPositionRef = useRef({ x: 0.5, y: 0.5 });
  const animationRef = useRef<number>();
  const faceDetectionRef = useRef<any>(null);

  // Smooth interpolation for eye movement
  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

  // Draw the pixel eyes
  const drawEyes = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Eye parameters
    const eyeWidth = width * 0.15;
    const eyeHeight = height * 0.25;
    const eyeGap = width * 0.12;
    const centerY = height / 2;

    // Calculate eye rotation based on face position
    const pos = facePositionRef.current;
    const maxRotation = Math.PI / 4; // 45 degrees

    // Left eye center
    const leftEyeX = width / 2 - eyeGap - eyeWidth / 2;
    // Right eye center
    const rightEyeX = width / 2 + eyeGap + eyeWidth / 2;

    // Rotation angle based on face position
    const angleX = (pos.x - 0.5) * maxRotation * 2;
    // Note: angleY could be used for vertical eye movement in future

    // Draw eyes with rotation
    ctx.save();

    // Eye color - pixel style
    const gradient = ctx.createLinearGradient(0, centerY - eyeHeight / 2, 0, centerY + eyeHeight / 2);
    gradient.addColorStop(0, '#4a90d9');
    gradient.addColorStop(0.5, '#2d5a8a');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;

    // Draw left eye
    ctx.save();
    ctx.translate(leftEyeX + eyeWidth / 2, centerY);
    ctx.rotate(angleX);
    ctx.fillRect(-eyeWidth / 2, -eyeHeight / 2, eyeWidth, eyeHeight);
    ctx.restore();

    // Draw right eye
    ctx.save();
    ctx.translate(rightEyeX + eyeWidth / 2, centerY);
    ctx.rotate(angleX);
    ctx.fillRect(-eyeWidth / 2, -eyeHeight / 2, eyeWidth, eyeHeight);
    ctx.restore();

    ctx.restore();
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Smooth interpolation
    facePositionRef.current.x = lerp(facePositionRef.current.x, targetPositionRef.current.x, 0.1);
    facePositionRef.current.y = lerp(facePositionRef.current.y, targetPositionRef.current.y, 0.1);

    drawEyes(ctx, canvas.width, canvas.height);
    animationRef.current = requestAnimationFrame(animate);
  }, [drawEyes]);

  // Initialize face detection
  useEffect(() => {
    let mounted = true;

    const initFaceDetection = async () => {
      try {
        setStatus('加载摄像头...');

        // Request camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 320, height: 240 }
        });

        if (!mounted) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('加载人脸检测...');

        // Load MediaPipe Face Detection
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/face_detection.js';
        script.async = true;

        script.onload = async () => {
          if (!mounted) return;

          try {
            // Create face detector
            const faceDetection = new window.FaceDetection({
              locateFile: (file: string) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${file}`;
              }
            });

            await faceDetection.setOptions({
              model: 'short',
              minDetectionConfidence: 0.5
            });

            faceDetection.onResults((results: any) => {
              if (results.detections && results.detections.length > 0) {
                const detection = results.detections[0];
                const bbox = detection.boundingBox;

                // Calculate face center (normalized 0-1)
                const centerX = (bbox.xCenter + bbox.width / 2) / 320;
                const centerY = (bbox.yCenter + bbox.height / 2) / 240;

                // Mirror X for selfie camera
                targetPositionRef.current = {
                  x: 1 - centerX,
                  y: centerY
                };
              }
            });

            faceDetectionRef.current = faceDetection;
            setStatus('就绪');

            // Start detection loop
            const detectFrame = async () => {
              if (!mounted || !videoRef.current || !faceDetectionRef.current) return;
              await faceDetectionRef.current.send({ image: videoRef.current });
              setTimeout(detectFrame, 100);
            };
            detectFrame();

          } catch (e) {
            console.error('Face detection init error:', e);
            setStatus('人脸检测初始化失败');
            setError((e as Error).message);
          }
        };

        script.onerror = () => {
          setStatus('加载人脸检测失败');
          setError('Failed to load MediaPipe');
        };

        document.head.appendChild(script);

      } catch (e) {
        console.error('Camera error:', e);
        setStatus('摄像头访问失败');
        setError((e as Error).message);
      }
    };

    initFaceDetection();

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      mounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [animate]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full relative bg-gray-900">
      {/* Hidden video for camera */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      {/* Canvas for eyes */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      {/* Status */}
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white text-sm rounded">
        {status}
      </div>
      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 z-10 p-4">
          <div className="text-center">
            <p className="text-white mb-4 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white text-red-900 rounded font-medium"
            >
              重试
            </button>
          </div>
        </div>
      )}
      {status === '就绪' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-xs rounded whitespace-nowrap">
          眼睛会跟随你的脸移动
        </div>
      )}
    </div>
  );
}
