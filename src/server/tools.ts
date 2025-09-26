import { ToolResult } from '../common/types.js';

export class ToolsManager {
  async executeTool(name: string, parameters: any): Promise<ToolResult> {
    try {
      switch (name) {
        case 'faq_lookup_tool':
          return await this.faqLookupTool(parameters.question);
        case 'convert_temperature_tool':
          return await this.convertTemperatureTool(parameters.value_celsius);
        default:
          return {
            success: false,
            result: '',
            error: `Unknown tool: ${name}`
          };
      }
    } catch (error) {
      return {
        success: false,
        result: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async faqLookupTool(question: string): Promise<ToolResult> {
    const q = question.toLowerCase();
    
    let answer: string;
    if (q.includes('багаж') || q.includes('сумк')) {
      answer = 'Можно взять одну сумку весом до 23 килограммов и размером 56 на 36 на 23 сантиметра.';
    } else if (q.includes('мест') || q.includes('самолет')) {
      answer = 'В самолёте 120 мест: 22 бизнес и 98 эконом. Аварийные выходы — в рядах 4 и 16.';
    } else if (q.includes('еда') || q.includes('питание') || q.includes('меню')) {
      answer = 'На борту подают горячее питание на рейсах более 3 часов. Напитки доступны всегда.';
    } else {
      answer = 'Извините, я не знаю ответа на этот вопрос.';
    }

    return {
      success: true,
      result: answer
    };
  }

  private async convertTemperatureTool(valueCelsius: number): Promise<ToolResult> {
    const fahrenheit = (valueCelsius * 9/5) + 32;
    return {
      success: true,
      result: `${valueCelsius}°C = ${fahrenheit.toFixed(1)}°F`
    };
  }
}