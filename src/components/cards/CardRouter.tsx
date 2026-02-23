import React from 'react';
import { Card } from '../../types';
import ImageCard from './ImageCard';
import QuizCard from './QuizCard';
import FlashCard from './FlashCard';

interface Props {
    card: Card;
}

/**
 * Routes a card to the correct component based on `card_type`.
 * Adding new card types only requires adding a case here.
 */
export default function CardRouter({ card }: Props) {
    switch (card.card_type) {
        case 'image':
            return <ImageCard card={card} />;
        case 'quiz':
            return <QuizCard card={card} />;
        case 'flashcard':
            return <FlashCard card={card} />;
        default:
            return null;
    }
}
