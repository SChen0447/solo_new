import { useEffect, useState } from 'react';
import type { Question, GradedAnswer } from '../../stores/classStore';

interface MultipleChoiceProps {
  question: Question;
  index: number;
  answer: string | string[] | null;
  graded: GradedAnswer | null;
  onChange: (value: string | string[]) => void;
  submitted: boolean;
}

function MultipleChoice({
  question,
  index,
  answer,
  graded,
