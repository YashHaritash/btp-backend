public class Main {
    public static void main(String[] args) {
        Calculator calc = new Calculator();
        
        // Test addition
        int addResult = calc.add(5, 3);
        System.out.println("Addition Test: 5 + 3 = " + addResult);

        // Test subtraction
        int subtractResult = calc.subtract(10, 4);
        System.out.println("Subtraction Test: 10 - 4 = " + subtractResult);

        // Test multiplication
        int multiplyResult = calc.multiply(7, 6);
        System.out.println("Multiplication Test: 7 * 6 = " + multiplyResult);

        // Test division
        try {
            int divideResult = calc.divide(20, 4);
            System.out.println("Division Test: 20 / 4 = " + divideResult);
        } catch (ArithmeticException e) {
            System.out.println("Division Test: " + e.getMessage());
        }

        // Test division by zero
        try {
            calc.divide(10, 0);
        } catch (ArithmeticException e) {
            System.out.println("Division by Zero Test: " + e.getMessage());
        }
    }
}

// Calculator class
class Calculator {
    // Method for addition
    public int add(int a, int b) {
        return a + b;
    }

    // Method for subtraction
    public int subtract(int a, int b) {
        return a - b;
    }

    // Method for multiplication
    public int multiply(int a, int b) {
        return a * b;
    }

    // Method for division
    public int divide(int a, int b) {
        if (b == 0) {
            throw new ArithmeticException("Cannot divide by zero");
        }
        return a / b;
    }
}
