import os
import json
import google.generativeai as genai
from django.conf import settings

class AIService:
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")
        genai.configure(api_key=self.api_key)
        
        if not hasattr(self, '_cached_model_name'):
             self._cached_model_name = self._select_best_model()
        print(f"Using Gemini Model: {self._cached_model_name}")
        self.model = genai.GenerativeModel(self._cached_model_name)

    def _select_best_model(self):
        preferred_models = [
            'gemini-1.5-flash',
            'gemini-flash-latest',
            'gemini-2.0-flash',
            'gemini-1.0-pro',
            'gemini-pro'
        ]
        try:
            available_models = [m.name.replace('models/', '') for m in genai.list_models()]
            for model in preferred_models:
                if model in available_models:
                    return model
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    return m.name.replace('models/', '')
        except Exception as e:
            print(f"Warning: Could not list models ({e}). Defaulting to gemini-flash-latest.")
        return 'gemini-flash-latest'

    def generate_daily_lesson(self, user_profile, topics, recently_used_verbs=None):
        """
        Generates 5 personalized verbs with detailed conjugations and varied sentence types.
        """
        native_lang = user_profile.native_language
        proficiency = user_profile.proficiency_level
        
        exclude_clause = ""
        if recently_used_verbs:
            exclude_clause = f"DO NOT use any of the following recently used verbs: {', '.join(recently_used_verbs)}."

        prompt = f"""
        Act as an English Teacher. Create a personalized daily lesson for a student.
        - Student Native Language: {native_lang}
        - English Level: {proficiency}
        - Interests: {', '.join(topics)}
        {exclude_clause}

        Output EXACTLY 5 verbs that are relevant to the user's interests.
        Return ONLY a JSON object in the following format:
        {{
          "verbs": [
            {{
              "word": "verb",
              "translation": "direct translation to {native_lang}",
              "base_form": "infinitive",
              "past_simple": "form",
              "past_participle": "form",
              "level": "{proficiency}",
              "conjugations": {{
                "present_simple": {{"form": "I verb, He/She/It verbs", "example": "A clear example sentence."}},
                "present_continuous": {{"form": "am/is/are verbing", "example": "A clear example sentence."}},
                "future_simple": {{"form": "will verb", "example": "A clear example sentence."}},
                "present_perfect": {{"form": "have/has verbed", "example": "A clear example sentence."}}
              }},
              "context_sentences": ["Affirmative sentence", "Negative sentence", "Interrogative sentence"],
              "quiz_questions": [
                {{"question": "Text?", "options": ["A", "B", "C"], "answer": "A"}},
                {{"question": "Text?", "options": ["A", "B", "C"], "answer": "B"}},
                {{"question": "Text?", "options": ["A", "B", "C"], "answer": "C"}}
              ],
              "fill_gap_exercise": {{"sentence": "Sentence with ____.", "answer": "verb"}}
            }}
          ]
        }}

        IMPORTANT: 
        1. Return exactly 5 verbs.
        2. Every conjugation MUST have both "form" and "example".
        3. The quiz MUST have exactly 3 questions.
        4. Return valid JSON ONLY.
        """

        try:
            response = self.model.generate_content(prompt)
            content = response.text
            # Clean JSON if necessary
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            print(f"Error generating content: {e}")
            return None
