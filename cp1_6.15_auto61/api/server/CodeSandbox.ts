import vm from 'vm'

interface TestCase {
  input: string
  expectedOutput: string
  isHidden: boolean
}

interface TestResult {
  passed: boolean
  output: string
  expected: string
  time: number
}

export class CodeSandbox {
  executeCode(code: string, testCases: TestCase[]): TestResult[] {
    const results: TestResult[] = []

    for (const testCase of testCases) {
      const result = this.runSingleTest(code, testCase)
      results.push(result)
    }

    return results
  }

  private runSingleTest(code: string, testCase: TestCase): TestResult {
    const start = performance.now()

    try {
      const wrappedCode = `
        ${code}
        __result = ${this.extractFunctionName(code)}(${this.parseInputToArgs(testCase.input)});
      `

      const context: Record<string, any> = {
        __result: undefined,
        console: {
          log: () => {},
          error: () => {},
          warn: () => {},
        },
      }

      vm.createContext(context)

      const script = new vm.Script(wrappedCode, {
        filename: 'sandbox.js',
        timeout: 5000,
      })

      script.runInContext(context, { timeout: 5000 })

      const elapsed = performance.now() - start
      const output = this.stringify(context.__result)
      const expected = testCase.expectedOutput.trim()

      return {
        passed: output === expected,
        output,
        expected,
        time: Math.round(elapsed),
      }
    } catch (error: any) {
      const elapsed = performance.now() - start
      return {
        passed: false,
        output: error.message || 'Runtime error',
        expected: testCase.expectedOutput.trim(),
        time: Math.round(elapsed),
      }
    }
  }

  private extractFunctionName(code: string): string {
    const match = code.match(/function\s+(\w+)/)
    return match ? match[1] : 'solution'
  }

  private parseInputToArgs(input: string): string {
    return input
  }

  private stringify(value: any): string {
    if (value === undefined) return 'undefined'
    if (value === null) return 'null'
    if (typeof value === 'boolean') return value.toString()
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return JSON.stringify(value)
    return JSON.stringify(value)
  }
}
