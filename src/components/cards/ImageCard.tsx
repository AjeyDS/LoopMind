import React from 'react';
import { StyleSheet, View, Text, Image, Dimensions } from 'react-native';
import { ImageCardData } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_W - Spacing['2xl'] * 2; // square with padding

interface Props {
    card: ImageCardData;
}

export default function ImageCard({ card }: Props) {
    return (
        <View style={styles.container}>
            {/* Card type badge */}
            <View style={styles.badge}>
                <Text style={styles.badgeText}>📷  Image</Text>
            </View>

            {/* Hook — scroll-stopping curiosity trigger above image */}
            {!!card.hook && (
                <Text style={styles.hook} numberOfLines={2}>
                    {card.hook}
                </Text>
            )}

            {/* Square image */}
            <View style={styles.imageWrapper}>
                {card.imageUrl ? (
                    <Image
                        source={{ uri: card.imageUrl }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={[styles.image, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 48 }}>🖼️</Text>
                        <Text style={{ color: '#999', marginTop: 8, fontSize: 13 }}>Image loading...</Text>
                    </View>
                )}
            </View>

            {/* Caption below image */}
            {!!card.caption && (
                <Text style={styles.caption} numberOfLines={3}>
                    {card.caption}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: SCREEN_W,
        height: SCREEN_H,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing['2xl'],
        overflow: 'hidden',
    },
    badge: {
        position: 'absolute',
        top: 60,
        right: Spacing.base,
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    badgeText: {
        color: Colors.primary,
        fontSize: Typography.xs,
        fontWeight: Typography.weightSemibold,
        letterSpacing: 0.3,
    },
    hook: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: Typography.weightBold,
        textAlign: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        lineHeight: 22,
    },
    imageWrapper: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        borderRadius: Radius.lg,
        overflow: 'hidden',
        backgroundColor: Colors.surface,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    caption: {
        color: 'rgba(80, 80, 100, 0.85)',
        fontSize: 14,
        fontWeight: Typography.weightMedium,
        textAlign: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        lineHeight: 20,
    },
});
