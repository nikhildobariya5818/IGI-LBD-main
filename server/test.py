import random
import os
from PIL import Image
import barcode
from barcode.writer import ImageWriter


def remove_white_background_fast(img: Image.Image):
    img = img.convert("RGBA")
    data = img.getdata()

    new_data = []
    for item in data:
        # remove white pixels
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))  # transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    return img


def generate_segmented_barcode(number_of_digits, start_digit, save_path):
    # Generate number
    number = str(start_digit) + "".join(
        str(random.randint(0, 9)) for _ in range(number_of_digits - 1)
    )
    number_with_spaces = f"{'  ' * 4}{number}{'  ' * 4}"
    digit_images = []

    for digit in number_with_spaces:  # ❗ only digits (no spaces)
        code = barcode.get("code128", digit, writer=ImageWriter())

        module_width = 3.0 if number_of_digits == 10 else 3.8
        module_height = 200.0 if number_of_digits == 10 else 300.0
        filename = code.save(
            "temp_digit",
            options={
                "write_text": False,
                "module_width": module_width,  # 🔥 thinner bars (important)
                "module_height": module_height,  # 🔥 tall like your reference
                "quiet_zone": 15.0,
                "font_size": 0,
            },
        )

        img = Image.open(filename)

        # remove white bg
        img = remove_white_background_fast(img)

        digit_images.append(img)

        os.remove(filename)  # cleanup temp file

    # spacing between digits
    spacing = 1

    total_width = sum(img.width for img in digit_images) + spacing * (
        len(digit_images) - 1
    )
    max_height = max(img.height for img in digit_images)

    final_img = Image.new("RGBA", (total_width, max_height), (255, 255, 255, 0))

    x_offset = 0
    for img in digit_images:
        final_img.paste(img, (x_offset, 0), img)
        x_offset += img.width + spacing

    final_img.save(save_path)

    return number_with_spaces, save_path


generate_segmented_barcode(10, 1, "segmented_barcode.png")
