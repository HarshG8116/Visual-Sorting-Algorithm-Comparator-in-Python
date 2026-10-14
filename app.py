
from flask import Flask, request, jsonify
from flask_cors import CORS
from time import perf_counter
import math

app = Flask(__name__)
CORS(app)


def sort_array(array, algorithm):
    arr = array.copy()
    steps = []
    comparisons = 0
    swaps = 0
    writes = 0

    def record(action, indices, message):
        steps.append({
            "step": len(steps) + 1,
            "array": arr.copy(),
            "action": action,
            "indices": indices,
            "sorted_indices": [],
            "message": message,
            "comparisons": comparisons,
            "swaps": swaps,
            "writes": writes
        })

    start = perf_counter()
    n = len(arr)

    # BUBBLE SORT
    if algorithm == "bubble":
        for i in range(n):
            for j in range(n - i - 1):
                comparisons += 1
                record(
                    "compare", [j, j + 1],
                    f"Comparing {arr[j]} and {arr[j + 1]}"
                )

                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
                    swaps += 1
                    writes += 2
                    record("swap", [j, j + 1], "Swapped elements")

    # SELECTION SORT
    elif algorithm == "selection":
        for i in range(n):
            minimum = i

            for j in range(i + 1, n):
                comparisons += 1
                record(
                    "compare", [minimum, j],
                    f"Comparing {arr[minimum]} and {arr[j]}"
                )

                if arr[j] < arr[minimum]:
                    minimum = j
                    record(
                        "minimum", [minimum],
                        f"New minimum: {arr[minimum]}"
                    )

            if minimum != i:
                arr[i], arr[minimum] = arr[minimum], arr[i]
                swaps += 1
                writes += 2
                record("swap", [i, minimum], "Placed minimum")

    # INSERTION SORT
    elif algorithm == "insertion":
        for i in range(1, n):
            key = arr[i]
            j = i - 1

            while j >= 0:
                comparisons += 1
                record(
                    "compare", [j, j + 1],
                    f"Comparing {arr[j]} with key {key}"
                )

                if arr[j] > key:
                    arr[j + 1] = arr[j]
                    writes += 1
                    record(
                        "shift", [j, j + 1],
                        f"Shifted {arr[j]} right"
                    )
                    j -= 1
                else:
                    break

            arr[j + 1] = key
            writes += 1
            record("insert", [j + 1], f"Inserted key {key}")

    elapsed = round((perf_counter() - start) * 1000, 4)

    return {
        "algorithm": algorithm.title() + " Sort",
        "original_array": array,
        "sorted_array": arr,
        "steps": steps,
        "metrics": {
            "comparisons": comparisons,
            "swaps": swaps,
            "writes": writes,
            "execution_ms": elapsed
        }
    }


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Sorting backend is working!"
    })


@app.route("/api/sort", methods=["POST"])
def sort_endpoint():
    data = request.get_json(silent=True) or {}

    array = data.get("array")
    algorithm = data.get("algorithm", "bubble")

    if algorithm not in ["bubble", "selection", "insertion"]:
        return jsonify({
            "error": "Invalid algorithm. Use bubble, selection, or insertion."
        }), 400

    if not isinstance(array, list) or not 1 <= len(array) <= 60:
        return jsonify({
            "error": "Enter between 1 and 60 numbers."
        }), 400

    if any(
        isinstance(x, bool)
        or not isinstance(x, (int, float))
        or not math.isfinite(x)
        for x in array
    ):
        return jsonify({
            "error": "All elements must be finite numbers."
        }), 400

    return jsonify(sort_array(array, algorithm))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
