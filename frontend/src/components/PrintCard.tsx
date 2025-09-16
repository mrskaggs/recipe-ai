import { forwardRef } from 'react';
import type { Recipe } from '../types';
import { usePrintOptions } from '../stores/recipeStore';

interface PrintCardProps {
  recipe: Recipe;
}

const PrintCard = forwardRef<HTMLDivElement, PrintCardProps>(({ recipe }, ref) => {
  const { printOptions } = usePrintOptions();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFontSizeClass = () => {
    switch (printOptions.fontSize) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  return (
    <div ref={ref} className={`print-card ${getFontSizeClass()} max-w-4xl mx-auto p-8 bg-white`}>
      {/* Header */}
      <div className="text-center mb-8 pb-4 border-b-2 border-gray-300">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
        {recipe.summary && (
          <p className="text-gray-600 italic">{recipe.summary}</p>
        )}
      </div>

      {/* Recipe Meta */}
      <div className="flex flex-wrap justify-center gap-6 mb-8 text-gray-600">
        {recipe.servings && (
          <div className="flex items-center space-x-1">
            <span className="font-medium">Servings:</span>
            <span>{recipe.servings}</span>
          </div>
        )}
        {recipe.totalTimeMin && (
          <div className="flex items-center space-x-1">
            <span className="font-medium">Time:</span>
            <span>{recipe.totalTimeMin} minutes</span>
          </div>
        )}
        {recipe.author && (
          <div className="flex items-center space-x-1">
            <span className="font-medium">By:</span>
            <span>{recipe.author.name || 'Anonymous'}</span>
          </div>
        )}
        <div className="flex items-center space-x-1">
          <span className="font-medium">Date:</span>
          <span>{formatDate(recipe.createdAt)}</span>
        </div>
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && printOptions.includeNotes && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b border-gray-300 pb-2">
          Ingredients
        </h2>
        {recipe.ingredients && recipe.ingredients.length > 0 ? (
          <div className="grid gap-2">
            {recipe.ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 py-1"
              >
                <span className="text-gray-500 font-mono text-sm w-6 flex-shrink-0">
                  {index + 1}.
                </span>
                <span className="text-gray-800">
                  {ingredient.qty && `${ingredient.qty} `}
                  {ingredient.unit && `${ingredient.unit} `}
                  {ingredient.item}
                  {ingredient.note && ` (${ingredient.note})`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No ingredients listed.</p>
        )}
      </div>

      {/* Instructions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b border-gray-300 pb-2">
          Instructions
        </h2>
        {recipe.steps && recipe.steps.length > 0 ? (
          <div className="space-y-4">
            {recipe.steps.map((step, index) => (
              <div
                key={index}
                className="flex space-x-4"
              >
                <span className="text-gray-500 font-bold text-lg w-8 flex-shrink-0">
                  {index + 1}
                </span>
                <p className="text-gray-800 leading-relaxed flex-1">{step}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No instructions provided.</p>
        )}
      </div>

      {/* Nutrition */}
      {printOptions.includeNutrition && recipe.nutrition && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b border-gray-300 pb-2">
            Nutrition Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recipe.nutrition.calories && (
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-900">{recipe.nutrition.calories}</div>
                <div className="text-sm text-gray-600">Calories</div>
              </div>
            )}
            {recipe.nutrition.protein && (
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-900">{recipe.nutrition.protein}g</div>
                <div className="text-sm text-gray-600">Protein</div>
              </div>
            )}
            {recipe.nutrition.carbs && (
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-900">{recipe.nutrition.carbs}g</div>
                <div className="text-sm text-gray-600">Carbs</div>
              </div>
            )}
            {recipe.nutrition.fat && (
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-900">{recipe.nutrition.fat}g</div>
                <div className="text-sm text-gray-600">Fat</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-300 text-center text-gray-500 text-sm">
        <p>Printed from Recipe AI - {new Date().toLocaleDateString()}</p>
        <p className="mt-1">www.recipe-ai.com</p>
      </div>
    </div>
  );
});

PrintCard.displayName = 'PrintCard';

export default PrintCard;
