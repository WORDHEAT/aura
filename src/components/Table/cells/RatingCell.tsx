import { Star } from 'lucide-react'

interface RatingCellProps {
    value: string
    onChange: (value: string) => void
}

export function RatingCell({ value, onChange }: RatingCellProps) {
    const rating = parseInt(value) || 0

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => onChange(star === rating ? '0' : star.toString())}
                    className="transition-colors p-1 sm:p-0"
                >
                    <Star
                        size={16}
                        className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-[#373737]'}
                    />
                </button>
            ))}
        </div>
    )
}
