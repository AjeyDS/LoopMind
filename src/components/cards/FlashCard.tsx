import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, Dimensions,
} from 'react-native';
import Animated, {
    useAnimatedStyle, useSharedValue, withTiming, interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashCardData } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow, Duration } from '../../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - Spacing['2xl'] * 2;
const CARD_H = SCREEN_H * 0.45;

interface Props {
    card: FlashCardData;
}

export default function FlashCard({ card }: Props) {
    const [isFlipped, setIsFlipped] = useState(false);
    const rotation = useSharedValue(0);

    const handleFlip = () => {
        rotation.value = withTiming(isFlipped ? 0 : 1, {
            duration: Duration.slow,
        });
        setIsFlipped(!isFlipped);
    };

    const frontStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(
            rotation.value, [0, 0.5, 1], [0, 90, 180], Extrapolate.CLAMP
        );
        return {
            transform: [{ rotateY: `${rotateY}deg` }],
            opacity: rotation.value < 0.5 ? 1 : 0,
        };
    });

    const backStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(
            rotation.value, [0, 0.5, 1], [180, 90, 0], Extrapolate.CLAMP
        );
        return {
            transform: [{ rotateY: `${rotateY}deg` }],
            opacity: rotation.value >= 0.5 ? 1 : 0,
        };
    });

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8F7FA', '#EAE8FF', '#F0EEFF']}
                locations={[0, 0.6, 1]}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>🃏  Flashcard</Text>
                </View>
                <Text style={styles.tapHint}>
                    {isFlipped ? '↩ Tap to see front' : '↪ Tap to reveal answer'}
                </Text>
            </View>

            {/* Card wrapper */}
            <TouchableOpacity
                onPress={handleFlip}
                activeOpacity={1}
                style={styles.cardWrapper}
            >
                {/* Front face */}
                <Animated.View style={[styles.face, styles.front, frontStyle]}>
                    <LinearGradient
                        colors={[Colors.primary, Colors.primaryDark]}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.faceContent}>
                        <Text style={styles.faceLabel}>TERM</Text>
                        <Text style={styles.frontText}>{card.front}</Text>
                        {card.hint && (
                            <View style={styles.hintBox}>
                                <Text style={styles.hintText}>💡 {card.hint}</Text>
                            </View>
                        )}
                    </View>
                    {/* Decorative circles */}
                    <View style={styles.decCircle1} />
                    <View style={styles.decCircle2} />
                </Animated.View>

                {/* Back face */}
                <Animated.View style={[styles.face, styles.back, backStyle]}>
                    <LinearGradient
                        colors={['#26de81', '#0cbd6e']}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.faceContent}>
                        <Text style={styles.faceLabel}>DEFINITION</Text>
                        <Text style={styles.backText}>{card.back}</Text>
                    </View>
                    <View style={[styles.decCircle1, styles.decCircleBack1]} />
                    <View style={[styles.decCircle2, styles.decCircleBack2]} />
                </Animated.View>
            </TouchableOpacity>

            {/* Footer rating prompt */}
            {isFlipped && (
                <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>How well did you know this?</Text>
                    <View style={styles.ratingButtons}>
                        {['😕 Missed', '🤔 Almost', '✅ Got it'].map((label) => (
                            <TouchableOpacity key={label} style={styles.ratingBtn}>
                                <Text style={styles.ratingBtnText}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: SCREEN_W,
        height: SCREEN_H,
        backgroundColor: Colors.background,
        alignItems: 'center',
        overflow: 'hidden',
    },
    header: {
        width: '100%',
        paddingHorizontal: Spacing['2xl'],
        paddingTop: 80,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing['2xl'],
    },
    badge: {
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    badgeText: {
        color: Colors.primary,
        fontSize: Typography.xs,
        fontWeight: Typography.weightSemibold,
        letterSpacing: 0.4,
    },
    tapHint: {
        color: Colors.textTertiary,
        fontSize: Typography.sm,
        fontWeight: Typography.weightMedium,
    },
    cardWrapper: {
        width: CARD_W,
        height: CARD_H,
        position: 'relative',
    },
    face: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: Radius['2xl'],
        overflow: 'hidden',
        ...Shadow.lg,
        backfaceVisibility: 'hidden',
    },
    front: {},
    back: {},
    faceContent: {
        flex: 1,
        padding: Spacing['2xl'],
        justifyContent: 'center',
        zIndex: 2,
    },
    faceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: Typography.xs,
        fontWeight: Typography.weightBold,
        letterSpacing: 2,
        marginBottom: Spacing.base,
    },
    frontText: {
        color: Colors.textOnDark,
        fontSize: Typography['3xl'],
        fontWeight: Typography.weightExtrabold,
        lineHeight: 40,
        letterSpacing: -0.5,
    },
    backText: {
        color: Colors.textOnDark,
        fontSize: Typography.lg,
        fontWeight: Typography.weightMedium,
        lineHeight: 28,
        letterSpacing: -0.2,
    },
    hintBox: {
        marginTop: Spacing.xl,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: Radius.md,
        padding: Spacing.md,
    },
    hintText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: Typography.sm,
        fontWeight: Typography.weightMedium,
        lineHeight: 20,
    },
    decCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -60,
        right: -60,
    },
    decCircle2: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -40,
        left: -40,
    },
    decCircleBack1: { top: -80, right: -80 },
    decCircleBack2: { bottom: -30, left: -30 },
    ratingRow: {
        marginTop: Spacing['2xl'],
        alignItems: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
    ratingLabel: {
        color: Colors.textSecondary,
        fontSize: Typography.sm,
        fontWeight: Typography.weightMedium,
        marginBottom: Spacing.md,
    },
    ratingButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    ratingBtn: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.border,
        ...Shadow.sm,
    },
    ratingBtnText: {
        fontSize: Typography.sm,
        fontWeight: Typography.weightSemibold,
        color: Colors.textPrimary,
    },
});
