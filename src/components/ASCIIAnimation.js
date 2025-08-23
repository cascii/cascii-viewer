import {useEffect, useRef, useState} from "react";

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

export default function ASCIIAnimation({className = "", fps = 24, frameFolder = "frames"}) {
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
            const loadedFrames = [];
            let i = 1;
            let failed = false;
            while (!failed) {
                try {
                    const filename = `frame_${String(i).padStart(4, "0")}.txt`;
                    const response = await fetch(`/projects/${frameFolder}/${filename}`);
                    if (!response.ok) {
                        failed = true;
                    } else {
                        const text = await response.text();
                        loadedFrames.push(text);
                        i++;
                    }
                } catch (error) {
                    failed = true;
                }
            }
            
            setFrames(loadedFrames);
            framesRef.current = loadedFrames;
            setCurrentFrame(0);
            setIsLoading(false);
        };

        loadFrames();
    }, [frameFolder]);

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
