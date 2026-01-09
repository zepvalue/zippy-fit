
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Cloud, Star, Disc } from 'lucide-react-native';
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
// INCREASED to 180 to make the map taller (steeper angles)
const TARGET_NODE_DISTANCE = 180;
const TOP_PADDING = 80; // Reduced further to move map higher
const BOTTOM_PADDING = 350; // HUGE spacing at bottom to clear the "Challenge Drawer"

// Helper to check if a date is a "Boss" node
const isBossNode = (date: Date, index: number) => {
    // Arbitrary logic: Every 7 days or weekends
    return (index + 1) % 7 === 0;
};

interface Point {
    x: number;
    y: number;
}

export default function JourneyMap({ history, onSpotRequest, canRequestSpot, spotStatus }: JourneyMapProps) {
    const scrollViewRef = useRef<ScrollView>(null);
    const today = new Date();

    // Generate Full Month Days
    // From Day 1 to Last Day of current month
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: string[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        // Handle timezone issue by forcing string format manually if needed,
        // but toISOString().split('T')[0] is usually fine if we don't care about UTC shifts for visual display
        // Better: create string manually to avoid UTC offset issues
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        days.push(yyyy + '-' + mm + '-' + dd);
    }

    const mascotSource = require('../../assets/animations/happy_zippy_animated.gif');

    // Dynamic Snake/Zig-Zag Logic
    // FREQUENCY = PI / 2 creates a sharp Zig-Zag.
    const containerWidth = width;
    const AMPLITUDE = containerWidth * 0.35;
    const FREQUENCY = Math.PI / 2;

    // --- COORDINATE GENERATION (CONSTANT DISTANCE) ---
    const points: Point[] = [];

    for (let i = 0; i < days.length; i++) {
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

    // --- SVG PATH GENERATION ---
    let pathD = `M ${points[0].x} ${points[0].y} `;
    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];

        const dy = next.y - current.y;
        const k = dy * 0.5;

        const cp1 = { x: current.x, y: current.y + k };
        const cp2 = { x: next.x, y: next.y - k };
        pathD += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.x} ${next.y} `;
    }

    // Determine cutoff for solid path
    // Find index of today
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayIndex = days.indexOf(todayStr); // -1 if not found (impossible ideally)
    const realTodayIndex = todayIndex !== -1 ? todayIndex : 0;

    let solidPathD = `M ${points[0].x} ${points[0].y} `;
    for (let i = 0; i < realTodayIndex; i++) {
        const current = points[i];
        const next = points[i + 1];
        const dy = next.y - current.y;
        const k = dy * 0.5;
        const cp1 = { x: current.x, y: current.y + k };
        const cp2 = { x: next.x, y: next.y - k };
        solidPathD += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.x} ${next.y} `;
    }

    // Generate random environmental props (Evenly Distributed)
    const renderEnvironment = () => {
        const items = [];
        // Generate decor relative to content height
        const decorCount = Math.floor(contentHeight / 100); // 1 item every 100px approx

        for (let i = 0; i < decorCount; i++) {
            const yPos = Math.random() * contentHeight;
            const xPos = Math.random() * width;
            const size = 10 + Math.random() * 30;
            const opacity = 0.2 + Math.random() * 0.4;

            if (i % 3 === 0) {
                items.push(<Cloud key={`c${i} `} size={size * 2} color="white" style={{ position: 'absolute', top: yPos, left: xPos, opacity: opacity * 0.5 }} />);
            } else if (i % 3 === 1) {
                items.push(<Star key={`s${i} `} size={size} color="#FCD34D" style={{ position: 'absolute', top: yPos, left: xPos, opacity: opacity }} />);
            } else {
                items.push(<Disc key={`d${i} `} size={size * 0.5} color="#D1D5DB" style={{ position: 'absolute', top: yPos, left: xPos, opacity: opacity }} />);
            }
        }
        return items;
    };

    // Auto-Scroll to Today
    useEffect(() => {
        if (scrollViewRef.current && todayIndex !== -1) {
            const y = points[todayIndex].y;
            // Center the node higher up: ScrollTo y - screenHeight * 0.4
            // This places the node at 40% from the top of the screen
            const scrollY = Math.max(0, y - height * 0.4);
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
            }, 500); // Slight delay for layout
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
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="4"
                        strokeDasharray="10, 10"
                        fill="none"
                    />
                    <Path
                        d={solidPathD}
                        stroke="white"
                        strokeWidth="4"
                        fill="none"
                    />
                </Svg>
            </View>

            {/* Nodes Container */}
            <View style={{ width: '100%', height: contentHeight }}>
                {days.map((date, index) => {
                    const isToday = date === todayStr;
                    const isCompleted = history.includes(date);

                    let status: PathNodeStatus = 'locked';
                    const dateObj = new Date(date);
                    // Simple logic for Past/Future based on index
                    if (index < todayIndex) {
                        status = isCompleted ? 'perfect' : 'locked';
                    } else if (index === todayIndex) {
                        status = 'active';
                    } else {
                        status = isBossNode(dateObj, index) ? 'boss' : 'locked';
                    }

                    // Absolute Position
                    const { x, y } = points[index];

                    return (
                        <Animated.View
                            key={date}
                            entering={FadeInDown.delay(index * 50).springify()} // Faster stagger
                            style={{
                                position: 'absolute',
                                left: x - 40,
                                top: y - 40,
                                width: 80,
                                height: 80,
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 10
                            }}
                        >
                            <PathNode
                                day={new Date(date).getDate()}
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
