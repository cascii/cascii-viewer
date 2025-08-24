import {useEffect, useRef, useState} from "react";

const IS_STATIC_SHOWCASE = process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEPLOY_TARGET === 'gh-pages';

class AnimationManager {
    _animation = null;
    callback;
    lastFrame = -1;
    frameTime = 1000 / 30;

    constructor(callback, fps = 30) {
        this.callback = callback;
        this.frameTime = 1000 / fps;
    }

    updateFPS(fps) {
        this.frameTime = 1000 / fps;
    }

    start() {
        if (this._animation != null) return;
        this._animation = requestAnimationFrame(this.update);
    }

    pause() {
        if (this._animation == null) return;
        this.lastFrame = -1;
        cancelAnimationFrame(this._animation);
        this._animation = null;
    }

    update = (time) => {
        const {lastFrame} = this;
        let delta = time - lastFrame;
        if (this.lastFrame === -1) {
            this.lastFrame = time;
        } else {
            while (delta >= this.frameTime) {
                this.callback();
                delta -= this.frameTime;
                this.lastFrame += this.frameTime;
            }
        }
        this._animation = requestAnimationFrame(this.update);
    };
}

export default function ASCIIAnimation({className = "", fps = 24, frameFolder = "frames", frameCount: frameCountProp}) {
    const [frames, setFrames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);
    const framesRef = useRef([]);

    const [animationManager] = useState(
        () =>
            new AnimationManager(() => {
                setCurrentFrame((current) => {
                    if (framesRef.current.length === 0) return current;
                    return (current + 1) % framesRef.current.length;
                });
            }, fps),
    );

    useEffect(() => {
        const loadFrames = async () => {
            try {
                let frameCount = frameCountProp;

                // If frameCount is not provided (local server version), fetch it.
                if (typeof frameCount !== 'number') {
                    const metaRes = await fetch(`/api/projects/${encodeURIComponent(frameFolder)}/frames-count`);
                    if (metaRes.ok) {
                        const meta = await metaRes.json();
                        frameCount = Number(meta.frameCount) || 0;
                    }
                }

                if (!frameCount || frameCount <= 0) {
                    setFrames([]);
                    setIsLoading(false);
                    return;
                }
                
                const basePath = IS_STATIC_SHOWCASE ? (process.env.PUBLIC_URL || '') : '/projects';

                const frameFiles = Array.from({length: frameCount}, (_, i) => `frame_${String(i + 1).padStart(4, "0")}.txt`);
                const framePromises = frameFiles.map(async (filename) => {
                    const response = await fetch(`${basePath}/${frameFolder}/${filename}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${filename}: ${response.status}`);
                    }
                    return await response.text();
                });

                const loaded = await Promise.all(framePromises);
                setFrames(loaded);
                framesRef.current = loaded;
                setCurrentFrame(0);
            } catch (e) {
                console.error("Failed to load ASCII frames:", e);
                setFrames([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadFrames();
    }, [frameFolder, frameCountProp]);

    useEffect(() => {
        animationManager.updateFPS(fps);
    }, [fps, animationManager]);

    useEffect(() => {
        if (frames.length === 0) return;
    
        const reducedMotion = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

        if (reducedMotion) {
            return;
        }

        const handleFocus = () => animationManager.start();
        const handleBlur = () => animationManager.pause();

        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        if (document.visibilityState === "visible") {
            animationManager.start();
        }

        return () => {
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
            animationManager.pause();
        };
    }, [animationManager, frames.length]);

    if (isLoading) {
        return (<div className={`font-mono whitespace-pre overflow-hidden ${className}`}>Loading ASCII animation...</div>);
    }

    if (!frames.length) {
        return (<div className={`font-mono whitespace-pre overflow-hidden ${className}`}>No frames loaded</div>);
    }

    return (<pre className={`relative font-mono overflow-hidden leading-none ${className}`}>{frames[currentFrame]}</pre>);
}
