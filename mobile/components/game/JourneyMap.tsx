
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Cloud, Star, Disc, Sparkles } from 'lucide-react-native';
import PathNode, { PathNodeStatus } from './PathNode';
import Svg, { Path } from 'react-native-svg';

interface JourneyMapProps {
    history: string[];
    onSpotRequest?: () => void;
    canRequestSpot?: boolean;
    spotStatus?: 'active' | 'none' | 'requested_by_partner';
}

const { width, height } = Dimensions.get('window');
// Tuned for "Duolingo-style" Zig-Zag
// We want significant horizontal travel (Amplitude) and relatively tight vertical packing.
// This forces flattened, diagonal connector lines.
// INCREASED to 210 to prevent "collapsing" when Amplitude is large.
// Math: dy = sqrt(210^2 - 140^2) ≈ 156px vertical spacing.
const TARGET_NODE_DISTANCE = 180;
const TOP_PADDING = 180; // Reduced further to move map higher
const BOTTOM_PADDING = 370; // HUGE spacing at bottom to clear the "Challenge Drawer"

interface Point {
    x: number;
    y: number;
}

export default function JourneyMap({ history, onSpotRequest, canRequestSpot, spotStatus }: JourneyMapProps) {
    const scrollViewRef = useRef<ScrollView>(null);
    const today = new Date();

    // Generate Full Month Days (Natural Order: 1..30)
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const naturalDays: string[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        naturalDays.push(yyyy + '-' + mm + '-' + dd);
    }

    // REVERSE for Display: Future (Top) -> Past (Bottom)
    // naturalDays[Last] -> Top
    // naturalDays[0] -> Bottom
    const displayDays = [...naturalDays].reverse();

    const mascotSource = require('../../assets/animations/happy_zippy_animated.gif');

    // Dynamic Snake/Zig-Zag Logic
    // FREQUENCY = PI / 2 creates a sharp Zig-Zag.
    const containerWidth = width;
    const AMPLITUDE = containerWidth * 0.35;
    const FREQUENCY = Math.PI / 2;

    // --- COORDINATE GENERATION (TOP -> BOTTOM) ---
    // points[0] corresponds to displayDays[0] (The Future-most day)
    const points: Point[] = [];

    for (let i = 0; i < displayDays.length; i++) {
        // Calculate Target X
        const x = (width / 2) + (Math.sin(i * FREQUENCY) * AMPLITUDE);

        let y = TOP_PADDING;

        if (i > 0) {
            const prev = points[i - 1];
            const dx = Math.abs(x - prev.x);
            // Ensure visual consistency
            const validDx = Math.min(dx, TARGET_NODE_DISTANCE - 1);
            const dy = Math.sqrt(Math.pow(TARGET_NODE_DISTANCE, 2) - Math.pow(validDx, 2));
            y = prev.y + dy;
        }

        points.push({ x, y });
    }

    const contentHeight = points[points.length - 1].y + BOTTOM_PADDING;

    // --- SVG PATH GENERATION (Top -> Bottom) ---
    // Make it "Curvier" by increasing the vertical control point influence (0.5 -> 0.75)
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];

        const dy = next.y - current.y;
        const k = dy * 0.75; // More pronounced S-curve

        const cp1 = { x: current.x, y: current.y + k };
        const cp2 = { x: next.x, y: next.y - k };
        pathD += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.x} ${next.y}`;
    }

    // Determine Solid Path (Past -> Today)
    // Since points go Top(Future) -> Bottom(Past),
    // We want the path to be solid for the "Past" section, which is from Bottom up to Today.
    // Or simpler: Connect Today -> Day 1 (Bottom).

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayDisplayIndex = displayDays.indexOf(todayStr);
    const realTodayIndex = todayDisplayIndex !== -1 ? todayDisplayIndex : 0;

    // Solid Path covers: [Today ... Bottom]
    // Subset of points: starts at realTodayIndex, goes to end.
    let solidPathD = "";
    if (todayDisplayIndex !== -1) {
        const solidPoints = points.slice(realTodayIndex);
        if (solidPoints.length > 0) {
            solidPathD = `M ${solidPoints[0].x} ${solidPoints[0].y}`;
            for (let i = 0; i < solidPoints.length - 1; i++) {
                const current = solidPoints[i];
                const next = solidPoints[i + 1];
                const dy = next.y - current.y;
                const k = dy * 0.75; // Match curvature
                const cp1 = { x: current.x, y: current.y + k };
                const cp2 = { x: next.x, y: next.y - k };
                solidPathD += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.x} ${next.y}`;
            }
        }
    }

    // Generate random environmental props (Evenly Distributed)
    const renderEnvironment = () => {
        const items = [];

        // 1. MACRO LAYER: Big, faint clouds to fill the void
        const macroCount = Math.floor(contentHeight / 400); // 1 big cloud every 400px
        for (let i = 0; i < macroCount; i++) {
            const yPos = Math.random() * contentHeight;
            const xPos = (Math.random() * width * 1.5) - (width * 0.25); // Allow off-screen
            const size = 150 + Math.random() * 200; // Huge: 150-350px
            items.push(
                <Cloud
                    key={`macro_c${i}`}
                    size={size}
                    color="white"
                    style={{
                        position: 'absolute',
                        top: yPos,
                        left: xPos,
                        opacity: 0.08, // Very faint
                        transform: [{ scaleX: 1.5 }] // Stretch horizontally
                    }}
                />
            );
        }

        // 2. MICRO LAYER: Dense details
        const decorCount = Math.floor(contentHeight / 40); // Denser: 1 every 40px
        for (let i = 0; i < decorCount; i++) {
            const yPos = Math.random() * contentHeight;
            const xPos = Math.random() * width;
            const size = 15 + Math.random() * 35; // Slightly larger base size
            const opacity = 0.3 + Math.random() * 0.5; // More visible

            const type = i % 4;

            if (type === 0) {
                items.push(<Cloud key={`c${i}`} size={size * 1.5} color="white" style={{ position: 'absolute', top: yPos, left: xPos, opacity: opacity * 0.6 }} />);
            } else if (type === 1) {
                items.push(<Star key={`s${i}`} size={size} color="#FCD34D" style={{ position: 'absolute', top: yPos, left: xPos, opacity: opacity }} />);
            } else if (type === 2) {
                items.push(<Sparkles key={`sp${i}`} size={size * 0.8} color="#93C5FD" style={{ position: 'absolute', top: yPos, left: xPos, opacity: opacity }} />);
            } else {
                items.push(<Disc key={`d${i}`} size={size * 0.4} color="#E5E7EB" style={{ position: 'absolute', top: yPos, left: xPos, opacity: opacity * 0.5 }} />);
            }
        }
        return items;
    };

    // Auto-Scroll to Today
    useEffect(() => {
        if (scrollViewRef.current && todayDisplayIndex !== -1) {
            const y = points[todayDisplayIndex].y;
            // Center the node.
            const scrollY = Math.max(0, y - height * 0.4);
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
            }, 500);
        }
    }, []);

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.container}
            contentContainerStyle={{ height: contentHeight }}
            showsVerticalScrollIndicator={false}
        >
            {/* Environmental Depth Layer */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {renderEnvironment()}
            </View>

            {/* SVG Path Layer */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width={width} height={contentHeight} style={{ position: 'absolute', top: 0 }}>
                    <Path
                        d={pathD}
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth="5"
                        strokeDasharray="15, 15"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <Path
                        d={solidPathD}
                        stroke="white"
                        strokeWidth="5"
                        strokeLinecap="round"
                        fill="none"
                    />
                </Svg>
            </View>

            {/* Nodes Container */}
            <View style={{ width: '100%', height: contentHeight }}>
                {displayDays.map((date, index) => {
                    const isToday = date === todayStr;
                    const isCompleted = history.includes(date);

                    // Logical Index (0 = Day 1, N = Day 30) for Boss/Math
                    const logicalIndex = naturalDays.length - 1 - index; // because we reversed it

                    let status: PathNodeStatus = 'locked';
                    // Fix timezone off-by-one error: Parse YYYY-MM-DD manually
                    const [y, m, d] = date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d); // Construct local date for logic if needed

                    // Simple logic for Past/Future based on index
                    // ... (rest of logic uses index, so dateObj is primarily for Boss check which we can also fix or keep if safe)
                    // Actually Boss check uses dateObj... `isBossNode(dateObj, ...)`
                    // checks (index+1)%7. It doesn't use dateObj really.

                    // index is 0 at Top (Future). todayIndex is Today.
                    // If index < todayDisplayIndex => It's Future (Locked)
                    // If index > todayDisplayIndex => It's Past (Check History)

                    if (index < realTodayIndex) {
                        // Future
                        status = 'locked';
                    } else if (index === realTodayIndex) {
                        status = 'active';
                    } else {
                        // Past
                        status = isCompleted ? 'perfect' : 'locked';
                    }

                    // Absolute Position
                    const { x, y: pointY } = points[index];

                    return (
                        <Animated.View
                            key={date}
                            entering={FadeInDown.delay(index * 50).springify()} // Faster stagger
                            style={{
                                position: 'absolute',
                                left: x - 40,
                                top: pointY - 40 + 15, // Shift down 15px so Circle Center aligns with Path (Label offsets center)
                                width: 80,
                                height: 80,
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 10
                            }}
                        >
                            <PathNode
                                day={d} // Use parsed day directly
                                status={status}
                                isToday={isToday}
                            />

                            {isToday && (
                                <Animated.View entering={FadeIn.delay(500)} style={styles.mascotContainer}>
                                    <Image source={mascotSource} style={styles.mascotImage} resizeMode="contain" />
                                </Animated.View>
                            )}
                        </Animated.View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    mascotContainer: {
        position: 'absolute',
        top: -60,
        width: 100,
        height: 100,
        zIndex: 20
    },
    mascotImage: {
        width: '100%',
        height: '100%'
    }
});
